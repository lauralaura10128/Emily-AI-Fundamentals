#!/usr/bin/env python3
"""
Scraper for https://books.toscrape.com/

Crawls the site one category at a time and writes one CSV row per book, with:
    title, category, price_gbp, availability, rating (1-5), detail_url,
    image_url, upc, product_type, tax_gbp, num_available, description

Crawling by category (rather than the flat catalogue) means every row knows
which category it belongs to, which the Supabase table and the web explorer
both filter on. It costs no extra requests: the 1,000 books are spread over
the same number of listing pages either way.

By default it scrapes just the listing pages (fast: ~1000 books, ~70 requests).
Pass --details to ALSO open each book's own page and pull the richer fields
(UPC, tax, stock count, description) -- that's ~1000 extra requests, so it's
slower and off by default. The `num_available` column that the explorer's
"minimum stock" filter uses only comes from those detail pages, so use
--details when you want to reproduce the full table.

Usage
-----
    pip install requests beautifulsoup4
    python books_scraper.py                      # listing data only -> books.csv
    python books_scraper.py --details            # include per-book detail pages
    python books_scraper.py --output mybooks.csv --limit 3   # first 3 categories

books.toscrape.com is a sandbox site built specifically for practising
scraping, so this is safe and intended to be crawled.
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://books.toscrape.com/"
REQUEST_DELAY = 0.5          # default polite pause between requests (seconds)
TIMEOUT = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; BooksToScrapeScraper/1.0; practice project)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# The site encodes the star rating as a word in the element's CSS class,
# e.g. <p class="star-rating Three">. Map those words to numbers.
RATING_WORDS = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}

LISTING_COLUMNS = [
    "title", "category", "price_gbp", "availability", "rating",
    "detail_url", "image_url",
]
DETAIL_COLUMNS = [
    "upc", "product_type", "tax_gbp", "num_available", "description",
]


def fetch(session: requests.Session, url: str, retries: int = 3) -> str | None:
    """GET a URL with retries + exponential backoff. Returns HTML or None."""
    for attempt in range(1, retries + 1):
        try:
            resp = session.get(url, timeout=TIMEOUT)
            resp.raise_for_status()
            # The site serves UTF-8; make sure £ etc. decode correctly.
            resp.encoding = resp.apparent_encoding or "utf-8"
            return resp.text
        except requests.HTTPError as exc:
            code = exc.response.status_code if exc.response else "?"
            print(f"[http {code}] {url} (attempt {attempt}/{retries})")
            if exc.response is not None and exc.response.status_code == 404:
                return None
        except requests.RequestException as exc:
            print(f"[error] {url}: {exc} (attempt {attempt}/{retries})")
        time.sleep(2 ** attempt)
    return None


def parse_categories(html: str, page_url: str) -> list[tuple[str, str]]:
    """Read the sidebar and return [(category name, category URL), ...].

    The sidebar's outer <li> is the "Books" root; the real categories are the
    nested ones, so only those are returned.
    """
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for a in soup.select("div.side_categories ul li ul li a"):
        name = a.get_text(strip=True)
        href = a.get("href")
        if name and href:
            out.append((name, urljoin(page_url, href)))
    return out


def parse_rating(pod) -> int | None:
    """Pull the 1-5 star rating out of the <p class='star-rating Xxx'> class."""
    p = pod.select_one("p.star-rating")
    if not p:
        return None
    for cls in p.get("class", []):
        if cls in RATING_WORDS:
            return RATING_WORDS[cls]
    return None


def parse_price(text: str) -> str:
    """'£51.77' -> '51.77' (strip the currency symbol and any stray chars)."""
    return text.replace("£", "").replace("Â", "").strip()


def parse_listing(html: str, page_url: str, category: str) -> list[dict]:
    """Extract every book on one listing page into a list of row dicts."""
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for pod in soup.select("article.product_pod"):
        title_a = pod.select_one("h3 a")
        price_el = pod.select_one("p.price_color")
        avail_el = pod.select_one("p.availability, p.instock")
        img_el = pod.select_one("img.thumbnail, div.image_container img")

        detail_href = title_a["href"] if title_a and title_a.has_attr("href") else ""
        img_src = img_el["src"] if img_el and img_el.has_attr("src") else ""

        rows.append({
            # The listing truncates the visible text, so take the full title
            # from the link's title attribute when present.
            "title": (title_a.get("title") or title_a.get_text(strip=True))
                     if title_a else "",
            "category": category,
            "price_gbp": parse_price(price_el.get_text(strip=True)) if price_el else "",
            "availability": avail_el.get_text(strip=True) if avail_el else "",
            "rating": parse_rating(pod) or "",
            "detail_url": urljoin(page_url, detail_href),
            "image_url": urljoin(page_url, img_src),
        })
    return rows


def parse_detail(html: str) -> dict:
    """Pull the richer fields from a single book's detail page."""
    soup = BeautifulSoup(html, "html.parser")
    data = {c: "" for c in DETAIL_COLUMNS}

    # The product-information table maps header -> value.
    table = {}
    for row in soup.select("table.table-striped tr"):
        th, td = row.find("th"), row.find("td")
        if th and td:
            table[th.get_text(strip=True)] = td.get_text(strip=True)

    data["upc"] = table.get("UPC", "")
    data["product_type"] = table.get("Product Type", "")
    data["tax_gbp"] = parse_price(table.get("Tax", ""))

    # "Availability" here looks like "In stock (22 available)".
    avail = table.get("Availability", "")
    digits = "".join(ch for ch in avail if ch.isdigit())
    data["num_available"] = digits

    desc_el = soup.select_one("#product_description ~ p")
    data["description"] = desc_el.get_text(strip=True) if desc_el else ""
    return data


def crawl_category(session: requests.Session, name: str, url: str,
                   delay: float = REQUEST_DELAY) -> list[dict]:
    """Walk every listing page of one category, following its 'next' links."""
    rows: list[dict] = []
    page = 0
    while url:
        page += 1
        html = fetch(session, url)
        if html is None:
            break
        rows.extend(parse_listing(html, url, name))

        soup = BeautifulSoup(html, "html.parser")
        nxt = soup.select_one("li.next a")
        url = urljoin(url, nxt["href"]) if nxt and nxt.has_attr("href") else None
        if url:
            time.sleep(delay)
    return rows


def scrape(output_file: str, with_details: bool, category_limit: int | None,
           delay: float = REQUEST_DELAY) -> int:
    session = requests.Session()
    session.headers.update(HEADERS)

    columns = LISTING_COLUMNS + (DETAIL_COLUMNS if with_details else [])

    home = fetch(session, BASE_URL)
    if home is None:
        print("Could not load the site's home page.")
        return 0

    categories = parse_categories(home, BASE_URL)
    if category_limit:
        categories = categories[:category_limit]
    print(f"Found {len(categories)} categories.")

    all_rows: list[dict] = []
    for i, (name, url) in enumerate(categories, start=1):
        time.sleep(delay)
        rows = crawl_category(session, name, url, delay)
        all_rows.extend(rows)
        print(f"[{i}/{len(categories)}] {name}: +{len(rows)} "
              f"(total {len(all_rows)})")

    if with_details:
        print(f"\nFetching {len(all_rows)} detail pages (this is the slow part)...")
        for n, row in enumerate(all_rows, start=1):
            time.sleep(delay)
            dhtml = fetch(session, row["detail_url"])
            row.update(parse_detail(dhtml) if dhtml
                       else {c: "" for c in DETAIL_COLUMNS})
            if n % 100 == 0:
                print(f"         {n}/{len(all_rows)} detail pages")

    if not all_rows:
        print("No books scraped.")
        return 0

    with open(output_file, "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\nDone. Wrote {len(all_rows)} books to {output_file}")
    return len(all_rows)


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape books.toscrape.com to CSV.")
    ap.add_argument("--output", default="books.csv", help="output CSV path")
    ap.add_argument("--details", action="store_true",
                    help="also crawl each book's detail page (slower; needed "
                         "for the num_available stock column)")
    ap.add_argument("--limit", type=int, default=None,
                    help="only scrape the first N categories")
    ap.add_argument("--delay", type=float, default=REQUEST_DELAY,
                    help=f"seconds to pause between requests "
                         f"(default {REQUEST_DELAY})")
    args = ap.parse_args()
    try:
        scrape(args.output, args.details, args.limit, args.delay)
    except KeyboardInterrupt:
        print("\nInterrupted.")
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
