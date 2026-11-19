#!/usr/bin/env python3
"""
Configurable web scraper (requests + BeautifulSoup -> CSV).

A polite, resilient scraper for STATIC HTML pages. You point it at a site,
describe the repeating "item" on each page and the fields inside each item
using CSS selectors, and it writes one CSV row per item.

Quick start
-----------
1. Install dependencies:
       pip install requests beautifulsoup4

2. Edit the CONFIG section below:
       - START_URL        : the first page to scrape
       - ITEM_SELECTOR    : CSS selector matching ONE repeating item (e.g. a product card)
       - FIELDS           : for each column, how to pull the value out of an item
       - NEXT_PAGE_SELECTOR (optional) : CSS selector for the "next page" link

3. Run it:
       python scraper.py
       # or override the config from the command line:
       python scraper.py --url "https://example.com/list" --output results.csv

How to find selectors
----------------------
Open the page in your browser, right-click an item -> "Inspect".
- ITEM_SELECTOR is the repeating container, e.g. "div.product-card" or "li.result".
- Each field selector is relative to one item, e.g. "h2.title a" for the title.
Use the browser console to test: document.querySelectorAll("div.product-card")

Only scrape sites you are allowed to. This script checks robots.txt and
rate-limits itself; please keep it polite and respect each site's terms.
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
import random
from dataclasses import dataclass
from typing import Callable, Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

# ============================================================================
# CONFIG  --  edit this section for the site you want to scrape
# ============================================================================

START_URL = "https://example.com/listings"

# CSS selector matching ONE repeating item on the page (a card, row, list item).
ITEM_SELECTOR = "div.item"

# Optional: CSS selector for the link to the next page. Leave as None for a
# single page. The scraper follows it until it disappears or MAX_PAGES is hit.
NEXT_PAGE_SELECTOR = "a.next"   # e.g. "a[rel='next']" ; set to None to disable

# Safety cap on how many pages to crawl (prevents accidental runaway loops).
MAX_PAGES = 20

OUTPUT_FILE = "output.csv"

# Seconds to wait between requests (plus a little random jitter). Be polite.
REQUEST_DELAY = 1.5

# How each CSV column is extracted from a single item element.
#   selector : CSS selector relative to the item (None = the item itself)
#   attr     : attribute to read; None reads the text. Use "href"/"src" for links/images.
#   Set attr="href"/"src" and absolute_url=True to resolve relative URLs.
FIELDS: dict[str, "Field"] = {}  # populated after the Field class is defined


@dataclass
class Field:
    selector: Optional[str] = None      # CSS selector within the item
    attr: Optional[str] = None          # attribute name, or None for text
    absolute_url: bool = False          # resolve relative URLs against the page
    default: str = ""                   # value if nothing matches
    transform: Optional[Callable[[str], str]] = None  # optional post-processor


# Define your columns here. Example for a generic product/listing card:
FIELDS = {
    "title": Field(selector="h2.title, h3.title, .title", attr=None),
    "price": Field(selector=".price", attr=None,
                   transform=lambda s: s.replace("$", "").strip()),
    "link":  Field(selector="a", attr="href", absolute_url=True),
    "image": Field(selector="img", attr="src", absolute_url=True),
}

# ============================================================================
# SCRAPER  --  you normally do not need to edit below this line
# ============================================================================

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; PolitePythonScraper/1.0; "
        "+https://example.com/bot-info)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def can_fetch(url: str, user_agent: str) -> bool:
    """Check the site's robots.txt before scraping. Fails open with a warning."""
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    rp = RobotFileParser()
    try:
        rp.set_url(robots_url)
        rp.read()
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] could not read robots.txt ({exc}); proceeding cautiously")
        return True
    allowed = rp.can_fetch(user_agent, url)
    if not allowed:
        print(f"[robots] {url} is disallowed by robots.txt")
    return allowed


def fetch(session: requests.Session, url: str, retries: int = 3) -> Optional[str]:
    """GET a URL with retries and exponential backoff. Returns HTML or None."""
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=20)
            resp.raise_for_status()
            return resp.text
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            print(f"[http {status}] {url} (attempt {attempt}/{retries})")
            # Don't bother retrying client errors other than rate limiting.
            if exc.response is not None and 400 <= exc.response.status_code < 500 \
                    and exc.response.status_code != 429:
                return None
        except requests.RequestException as exc:
            print(f"[error] {url}: {exc} (attempt {attempt}/{retries})")
        time.sleep(2 ** attempt)  # 2s, 4s, 8s
    return None


def extract_field(item, field: Field, page_url: str) -> str:
    """Pull a single value out of an item element according to its Field spec."""
    target = item if field.selector is None else item.select_one(field.selector)
    if target is None:
        return field.default

    if field.attr is None:
        value = target.get_text(strip=True)
    else:
        value = target.get(field.attr, field.default)
        if value and field.absolute_url:
            value = urljoin(page_url, value)

    if value and field.transform:
        try:
            value = field.transform(value)
        except Exception:  # noqa: BLE001
            pass
    return value or field.default


def parse_page(html: str, page_url: str) -> list[dict]:
    """Extract all items from one page of HTML into a list of row dicts."""
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    items = soup.select(ITEM_SELECTOR)
    if not items:
        print(f"[warn] no items matched '{ITEM_SELECTOR}' on {page_url}")
    for item in items:
        rows.append({name: extract_field(item, spec, page_url)
                     for name, spec in FIELDS.items()})
    return rows


def find_next_page(html: str, page_url: str) -> Optional[str]:
    """Resolve the next-page URL from the current page, if configured."""
    if not NEXT_PAGE_SELECTOR:
        return None
    soup = BeautifulSoup(html, "html.parser")
    link = soup.select_one(NEXT_PAGE_SELECTOR)
    if link and link.get("href"):
        return urljoin(page_url, link["href"])
    return None


def scrape(start_url: str, output_file: str) -> int:
    """Crawl from start_url, following pagination, and write rows to CSV."""
    session = requests.Session()
    session.headers.update(HEADERS)

    if not can_fetch(start_url, HEADERS["User-Agent"]):
        print("Aborting: start URL is disallowed by robots.txt.")
        return 0

    all_rows: list[dict] = []
    url: Optional[str] = start_url
    seen: set[str] = set()
    pages = 0

    while url and pages < MAX_PAGES:
        if url in seen:
            print(f"[stop] already visited {url}; breaking loop")
            break
        seen.add(url)
        pages += 1
        print(f"[page {pages}] fetching {url}")

        html = fetch(session, url)
        if html is None:
            print(f"[skip] failed to fetch {url}")
            break

        page_rows = parse_page(html, url)
        all_rows.extend(page_rows)
        print(f"         +{len(page_rows)} items (total {len(all_rows)})")

        url = find_next_page(html, url)
        if url:
            time.sleep(REQUEST_DELAY + random.uniform(0, 0.75))

    if not all_rows:
        print("No rows scraped; nothing written. Check your selectors.")
        return 0

    fieldnames = list(FIELDS.keys())
    with open(output_file, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\nDone. Wrote {len(all_rows)} rows to {output_file}")
    return len(all_rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Configurable HTML -> CSV scraper.")
    parser.add_argument("--url", default=START_URL, help="start URL to scrape")
    parser.add_argument("--output", default=OUTPUT_FILE, help="output CSV path")
    args = parser.parse_args()

    try:
        scrape(args.url, args.output)
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
