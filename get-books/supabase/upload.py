#!/usr/bin/env python3
"""
Upload scraped books into Supabase.

Reads books.csv (produced by books_scraper.py) and upserts every row into the
`books` table in your Supabase project, in batches. Upsert means re-running it
updates existing books (matched on detail_url) instead of creating duplicates,
so you can run the scraper + this uploader on a schedule and the table just
stays current.

SETUP
-----
1. Create the table once: run schema.sql in Supabase's SQL Editor.

2. Install the one dependency:
       pip install requests

3. Give the script your project credentials via environment variables
   (this keeps your secret key OUT of the code and out of any chat).
   Find both in Supabase: Dashboard -> Project Settings -> API.

   macOS / Linux:
       export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
       export SUPABASE_KEY="your-service_role-key"

   Windows (PowerShell):
       $env:SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
       $env:SUPABASE_KEY="your-service_role-key"

   Use the service_role key for a trusted server-side loader like this (it
   bypasses row-level security). Keep it secret — never commit it or put it
   in a browser/client app. The anon key also works only if your RLS policies
   allow inserts.

USAGE
-----
    python upload.py                 # loads books.csv into table "books"
    python upload.py --csv other.csv --table my_books
    python upload.py --dry-run       # parse + validate, upload nothing
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import time

import requests

BATCH_SIZE = 500          # rows per request; Supabase handles this comfortably
CONFLICT_COLUMN = "detail_url"   # unique column used to upsert


def load_rows(csv_path: str) -> list[dict]:
    """Read the scraper's CSV and coerce types to match the table."""
    rows = []
    with open(csv_path, newline="", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            price = r.get("price_gbp", "").strip()
            rating = r.get("rating", "").strip()
            stock = r.get("num_available", "").strip()
            rows.append({
                "title": r.get("title", "").strip(),
                "category": r.get("category", "").strip() or None,
                "price_gbp": float(price) if price else None,
                "availability": r.get("availability", "").strip() or None,
                "rating": int(rating) if rating.isdigit() else None,
                # Only present when the scraper ran with --details.
                "num_available": int(stock) if stock.isdigit() else None,
                "detail_url": r.get("detail_url", "").strip() or None,
                "image_url": r.get("image_url", "").strip() or None,
            })
    return rows


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def upload(rows: list[dict], url: str, key: str, table: str) -> None:
    endpoint = f"{url.rstrip('/')}/rest/v1/{table}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        # merge-duplicates => upsert on the table's unique/PK column
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    params = {"on_conflict": CONFLICT_COLUMN}

    total = 0
    for i, batch in enumerate(chunked(rows, BATCH_SIZE), start=1):
        for attempt in range(1, 4):
            resp = requests.post(endpoint, params=params, headers=headers,
                                 json=batch, timeout=30)
            if resp.status_code in (200, 201, 204):
                total += len(batch)
                print(f"[batch {i}] upserted {len(batch)} rows (total {total})")
                break
            if resp.status_code == 429:  # rate limited; back off and retry
                time.sleep(2 ** attempt)
                continue
            # Any other error: show the server's message and stop.
            print(f"[batch {i}] FAILED {resp.status_code}: {resp.text[:500]}")
            sys.exit(1)
        time.sleep(0.2)
    print(f"\nDone. Upserted {total} rows into '{table}'.")


def main() -> int:
    ap = argparse.ArgumentParser(description="Upload books.csv to Supabase.")
    ap.add_argument("--csv", default="books.csv", help="input CSV path")
    ap.add_argument("--table", default="books", help="target Supabase table")
    ap.add_argument("--dry-run", action="store_true",
                    help="parse and validate only; do not upload")
    args = ap.parse_args()

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    rows = load_rows(args.csv)
    print(f"Parsed {len(rows)} rows from {args.csv}")

    if args.dry_run:
        print("Dry run — sample row:")
        print(rows[0] if rows else "(no rows)")
        return 0

    if not url or not key:
        print("ERROR: set SUPABASE_URL and SUPABASE_KEY environment variables "
              "(see the setup notes at the top of this file).")
        return 2

    upload(rows, url, key, args.table)
    return 0


if __name__ == "__main__":
    sys.exit(main())
