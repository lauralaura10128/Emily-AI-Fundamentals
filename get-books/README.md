# get-books

Scrapes every book from [books.toscrape.com](https://books.toscrape.com) (1,000 titles
across 50 pages), stores them in a Supabase (Postgres) table, and provides an
interactive web explorer to browse and filter them live.

## What's here

```
index.html            # Interactive book explorer (reads live from Supabase)
scraper/
  books_scraper.py    # Scraper tailored to books.toscrape.com -> CSV
  generic_scraper.py  # Configurable scraper template for other static sites
supabase/
  schema.sql          # Table definition for the books table
  upload.py           # Loads the CSV into Supabase via the REST API
data/
  books.csv           # Snapshot of the scraped data (title, category, price, rating, stock, links)
```

## The explorer (`index.html`)

A single, self-contained page — no build step. Open it in a browser and it queries
the Supabase `books` table live and lets you filter by:

- **Category** (50 categories)
- **Minimum rating** (1–5 stars)
- **Price range** (£)
- **Minimum stock**
- plus title search, sorting, and a "Top picks" row of the highest-rated books.

It connects with the project's **publishable** Supabase key, which is safe to expose
in a browser because the table has Row Level Security enabled with a read-only policy.
(The secret/service key is never used here and is not in this repo.)

### Host it free on GitHub Pages

Since the explorer is named `index.html`, you can serve it as a live website:
**Settings → Pages → Build from branch → `main` / root**. Your explorer will then be
live at `https://lauralaura10128.github.io/get-books/`.

## Re-running the scrape

```bash
pip install requests beautifulsoup4
python scraper/books_scraper.py            # writes books.csv
python scraper/books_scraper.py --details  # also pulls per-book detail pages
```

## Loading into Supabase

1. Run `supabase/schema.sql` in the Supabase SQL editor to create the table.
2. Set credentials and upload:

```bash
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_KEY="your-service_role-key"   # server-side only; keep secret
python supabase/upload.py
```

## Data source

All book data comes from [books.toscrape.com](https://books.toscrape.com), a public
sandbox site built specifically for practising web scraping.
