# Emily-AI-Fundamentals

Individual assignment for **Applied Programming and AI Fundamentals** (Nova, Semester 3).

Three small, self-contained projects: a web scraper with a live database-backed
explorer, a Chrome new-tab extension, and a single-file TV guide. None of them
need a build step, and each folder has its own detailed README.

| Project | What it is | Built with |
| --- | --- | --- |
| [**get-books**](get-books/) | Scrapes 1,000 books from a practice site into Supabase, plus a browser explorer to filter them live | Python, BeautifulSoup, Supabase/Postgres, vanilla JS |
| [**my-monomentum**](my-monomentum/) | A calm Momentum-style new tab page for Chrome — clock, weather, priorities, quotes | Chrome extension (Manifest V3), vanilla JS/CSS |
| [**zapp**](zapp/) | A TV guide and show browser for the TVmaze API, in one HTML file | Vanilla JS, IndexedDB, jsdom tests |

---

## 1. get-books — scraping to a live database

→ [folder](get-books/) · [README](get-books/README.md)

Crawls all 50 catalogue pages of [books.toscrape.com](https://books.toscrape.com)
(a public sandbox built for practising scraping), writes one CSV row per book,
loads those rows into a Supabase table, and serves a web page that queries that
table live and lets you filter and sort the results in the browser.

So the project covers the full path end to end: **scrape → CSV → database → UI.**

| File | What it does |
| --- | --- |
| [`scraper/books_scraper.py`](get-books/scraper/books_scraper.py) | The scraper itself. 50 listing requests by default; `--details` also opens each book's own page for UPC, tax, stock count and description. |
| [`scraper/generic_scraper.py`](get-books/scraper/generic_scraper.py) | The same idea made reusable — you describe a site's repeating item and its fields with CSS selectors, and it writes a CSV for any static page. |
| [`data/books.csv`](get-books/data/books.csv) | A snapshot of the scrape: 1,000 books with title, price, availability, rating and links. |
| [`supabase/schema.sql`](get-books/supabase/schema.sql) | The Postgres table, with `detail_url` as the upsert key so re-running the scrape updates rather than duplicates. |
| [`supabase/upload.py`](get-books/supabase/upload.py) | Pushes the CSV into Supabase through its REST API. |
| [`index.html`](get-books/index.html) | The explorer — one page, no dependencies, reads straight from Supabase with the publishable key (the table is read-only via Row Level Security). |

**Run it:**

```bash
pip install requests beautifulsoup4
python get-books/scraper/books_scraper.py   # writes books.csv
open get-books/index.html                   # the explorer
```

Full setup for the database half is in the [project README](get-books/README.md).

---

## 2. my-monomentum — a Chrome new tab page

→ [folder](my-monomentum/) · [README](my-monomentum/README.md)

Replaces Chrome's new tab with a quieter one: a clock and a greeting that
changes through the day, a landscape photo that rotates daily, a priorities
checklist, live Lisbon weather, a fresh quote each time, a search bar, a
countdown to the next German public holiday, and a notes scratchpad.

Everything is stored locally in `chrome.storage.local` — no accounts, no
tracking, nothing leaves the browser. The only two network calls are Unsplash
for the photo and [Open-Meteo](https://open-meteo.com) for the weather, which
needs no API key.

| File | What it does |
| --- | --- |
| [`manifest.json`](my-monomentum/manifest.json) | Manifest V3 config — overrides the new tab, requests only `storage` and the two hosts above. |
| [`newtab.html`](my-monomentum/newtab.html) | The page itself. |
| [`js/newtab.js`](my-monomentum/js/newtab.js) | Clock, greeting, background switching and the priorities list. |
| [`js/weather.js`](my-monomentum/js/weather.js) | Live Lisbon weather, refreshed every 15 minutes, last reading cached for offline. |
| [`js/backgrounds.js`](my-monomentum/js/backgrounds.js) | The curated Unsplash photo list; the day's pick is deterministic and preloaded. |
| [`js/quotes.js`](my-monomentum/js/quotes.js) | Bundled quotes, so a new one appears instantly even offline. |
| [`js/holidays.js`](my-monomentum/js/holidays.js) | Computes Germany's nationwide holidays offline, including the moving Easter-based ones. |
| [`js/notes.js`](my-monomentum/js/notes.js) | The autosaving scratchpad. |
| [`css/style.css`](my-monomentum/css/style.css) | Styling, with the colours and layout as CSS variables at the top. |

**Install:** `chrome://extensions` → turn on **Developer mode** → **Load unpacked**
→ pick the `my-monomentum` folder. Step-by-step notes are in the
[project README](my-monomentum/README.md).

---

## 3. zapp — a TV guide in one file

→ [folder](zapp/) · [README](zapp/README.md)

A show browser built on the [TVmaze API](https://www.tvmaze.com/api): tonight's
broadcast schedule for any country and date, search, a browsable index of all
91,242 shows, per-show episode guides with watched toggles, and a personal
watchlist with next-episode countdowns.

It is a single HTML file with no build step, no API key and no runtime
dependencies — TVmaze allows cross-origin requests, so it runs straight from
`file://`. The interesting parts are the workarounds for what the API actually
does: search is hard-capped at 10 results, so browsing the full database means
indexing 383 pages into IndexedDB; and the per-country schedule endpoint quietly
drops episodes with no announced airtime, so a "deep check" mode merges four
sources and reports what each contributed. Long lists render through a virtual
window, keeping about 42 cards in the DOM however long the list is.

| File | What it does |
| --- | --- |
| [`zapp.html`](zapp/zapp.html) | The whole app — markup, styles, logic, API transport layer and storage. |
| [`test/run.mjs`](zapp/test/run.mjs) | 176 assertions against the real page in jsdom with mocked API payloads: both schedule shapes, the four-source merge, filters, virtual scrolling, the watchlist round-trip and storage migration. |
| [`package.json`](zapp/package.json) | Just the test script and jsdom; nothing is needed to run the app. |
| [`zapp-logo.svg`](zapp/zapp-logo.svg) | The logo. |

**Run it:**

```bash
open zapp/zapp.html   # that's all

cd zapp && npm install && npm test   # the test suite
```

The [project README](zapp/README.md) also documents what was measured about the
TVmaze API (rate limits, coverage, payload sizes) — findings from the API itself
rather than from its docs.

---

## Repository layout

```
.
├── get-books/        # scraper → Supabase → web explorer
├── my-monomentum/    # Chrome new tab extension
├── zapp/             # single-file TVmaze TV guide
└── .gitignore        # keeps keys, .env files and build junk out of git
```

No secrets are committed anywhere in this repository. `get-books` uses an
environment variable for its Supabase service key, and the explorer ships only
the publishable read-only key.
