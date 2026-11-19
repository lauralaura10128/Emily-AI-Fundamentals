# Emilys Monomentum

A calm, Momentum-style **new tab page** for Chrome. Every time you open a new
tab you get:

- 🕑 **A live clock with a personal greeting** — "Good morning, Emily" that
  updates through the day (morning / afternoon / evening). Click your name to
  change it any time.
- 🌄 **A daily rotating background** — a fresh, high-resolution landscape photo
  from Unsplash each day, cached so it loads instantly and falls back to a soft
  gradient when you're offline.
- ✅ **A priorities list** — jot down what matters today, check things off,
  clear completed items, and collapse the card when you want a clean view. Your
  list is saved locally and survives restarts.
- 🌦️ **Live Lisbon weather** — current temperature, conditions and an icon for
  Lisbon in the top-left, fetched live from [Open-Meteo](https://open-meteo.com)
  (no API key), refreshed every 15 minutes and when you return to the tab, with
  the last reading cached for offline.
- 💬 **A fresh quote on every tab** — a different motivational quote each
  time you open a new tab, bundled in so it works instantly and offline.
- 🔎 **A web search bar** — type and press Enter to search the web right
  from the new tab.
- 🇩🇪 **German public-holiday countdown** — days until Germany's next
  nationwide holiday, computed offline so it's always correct.
- 📝 **Notes scratchpad** — a collapsible notepad in the corner that
  autosaves as you type.

Everything is stored **locally on your machine** (`chrome.storage.local`) — no
accounts, no tracking, no data leaves your browser.

## Install (load unpacked)

This extension isn't on the Chrome Web Store; you load it directly from the
source in a few seconds:

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this project folder (the one containing
   `manifest.json`).
5. Open a new tab — you're done. 🎉

To update later, `git pull` and click the **refresh** icon on the extension
card in `chrome://extensions`.

> Chrome only allows one extension to control the new tab page at a time. If
> another new-tab extension is installed, disable it first.

## Customization

- **Your name** — click the name in the greeting on the new tab page.
- **Background photos** — edit the `UNSPLASH_PHOTO_IDS` list in
  [`js/backgrounds.js`](js/backgrounds.js). Each entry is an Unsplash photo ID
  (the part after `photo-` in an `images.unsplash.com` URL).
- **Colors & layout** — tweak the CSS variables at the top of
  [`css/style.css`](css/style.css).

## Project structure

```
my-monomentum/
├── manifest.json        # MV3 extension manifest
├── newtab.html          # the new tab page
├── css/
│   └── style.css        # styling
├── js/
│   ├── backgrounds.js   # curated Unsplash photo list
│   ├── weather.js       # live Lisbon weather (Open-Meteo)
│   ├── quotes.js        # bundled quotes, a new one each open
│   ├── holidays.js      # German public-holiday countdown (offline)
│   ├── notes.js         # autosaving notes scratchpad
│   └── newtab.js        # clock, greeting, background & priorities logic
└── icons/               # 16 / 48 / 128 px icons
```

## Tech notes

- Manifest V3, no build step, no dependencies.
- Uses `chrome.storage.local` when installed, with a `localStorage` fallback so
  `newtab.html` also works when opened directly (useful for quick testing).
- Background images are picked deterministically per day, preloaded, and cached
  by URL; a bad or unreachable image gracefully falls through to the next one.

## License

MIT — see [LICENSE](LICENSE).

---

Photos courtesy of the photographers on [Unsplash](https://unsplash.com/).
