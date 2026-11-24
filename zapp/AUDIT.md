# Pre-publication audit — zapp

Audit of this project before publishing the repository publicly.
Date: 24 November 2026. Re-run after the fixes below were applied.

## What was checked

- Every tracked file, plus the **full Git history including deleted files**, searched
  for secret-shaped values: API keys, tokens, JWTs, private-key blocks and
  `password=` / `secret=` assignments.
- Which files are tracked, untracked and ignored; whether `node_modules/`, caches or
  build output are committed.
- `.gitignore` coverage and dependency reproducibility.
- Outbound network calls and how third-party content is handled.
- Stored data and where it lives.
- README coverage of purpose, data collection, persistence, user interaction, setup,
  learning and limitations.

## Findings

### Secrets — none, and none are possible

This project has **no credentials**. The TVmaze API is free and requires no key or
account, so there is nothing to leak. No secret-shaped value appears in any file or
in any commit.

### Data handling — nothing leaves the browser

| Store | Contents |
| --- | --- |
| `localStorage` | Watchlist (show IDs only), watched-episode state, theme |
| IndexedDB (`zapp` / `shows`) | Cached show index and schedule |

No account, no server, no analytics, no telemetry. The watchlist holds only numeric
show IDs, not titles or any personal information. Backup and restore are manual, via
a JSON list the user controls.

### Third-party content — handled safely

- **Show summaries arrive from TVmaze as HTML** and are stripped to text before being
  rendered. This was specifically checked, because injecting API-supplied HTML into
  the DOM would be an XSS vector. The project does not do that.
- **Poster art is hot-linked from TVmaze** and remains the copyright of its rights
  holders. No images are redistributed in this repository, and the README credits
  TVmaze as the data source.
- The only other outbound requests are to Google Fonts for two webfonts.

### Repository hygiene — clean

- `node_modules/` is ignored and not tracked; no dependency folder is committed.
- `.DS_Store` ignored and not tracked.
- No caches or build output. The application is a single HTML file with no build step.
- Working tree clean.

## Issues found and fixed

| Issue | Fix |
| --- | --- |
| `.gitignore` excluded `package-lock.json`, so `npm install` was not reproducible — a future `jsdom` release could silently break the test suite for anyone cloning the repository | Removed that rule and committed a lockfile pinning the full dependency tree (29 packages, `jsdom` 31.0.1) |
| Repository had no licence at its root | Added MIT `LICENSE` at the repository root (matching the `"license": "MIT"` already declared in `package.json`) |

## Remaining limitations

- **`jsdom` is the single dependency** and is now pinned, but it is a development
  dependency only; no third-party code ships in the application itself. The lockfile
  was generated at audit time and is not automatically monitored for advisories.
- **No accessibility audit** has been carried out. Keyboard shortcuts exist, but
  screen-reader behaviour and focus management inside the virtual-scrolling list are
  untested.
- **The app depends entirely on a third-party API** that could change or disappear.
  There is no cached fallback if TVmaze is unavailable, so the page would be empty.
- **Rate limiting is self-imposed** (16 calls per 10 seconds, 4 concurrent, with
  backoff on HTTP 429), based on a measured limit rather than a documented one. If
  TVmaze tightens its limits, the throttle would need revisiting.
- **Finding no secrets does not prove the project is safe.** The searches look for
  known patterns; a credential in an unusual format could evade them.
- **Repository-level GitHub settings were not inspected**: visibility, collaborators,
  Actions secrets and branch protection are outside what can be checked from the
  working tree.
