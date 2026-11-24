# Pre-publication audit — my-monomentum

Audit of this project before publishing the repository publicly.
Date: 24 November 2026. Re-run after the fixes below were applied.

## What was checked

- Every tracked file, plus the **full Git history including deleted files**, searched
  for secret-shaped values: API keys, tokens, JWTs, private-key blocks and
  `password=` / `secret=` assignments.
- Which files are tracked, untracked and ignored; whether any OS, cache, dependency
  or build output is committed.
- `.gitignore` coverage, with attention to the extension-specific artefacts that must
  never be published.
- Outbound network calls and the permissions the extension requests.
- Personal and location data in the source.
- README coverage of purpose, data collection, persistence, user interaction, setup,
  learning and limitations.

## Findings

### Secrets — none, and none are needed

This project has **no credentials of any kind**. Both of its network calls are to
services that require no API key:

| Service | Purpose | Authentication |
| --- | --- | --- |
| `api.open-meteo.com` | Current weather | None required |
| `images.unsplash.com` | Background photographs | None — static image URLs only, no API call |

No secret-shaped value appears in any file or in any commit.

### Extension-specific risks — correctly handled

`.gitignore` excludes `*.pem`, `*.crx` and `*.zip`. This matters: a `.pem` file is the
private signing key for a Chrome extension, and publishing one would let anyone
publish updates impersonating this extension. No such file is tracked, and none
appears anywhere in the Git history.

`manifest.json` requests the minimum: the `storage` permission, and host permissions
for exactly the two hosts above — no broad `<all_urls>` grant.

### Data handling — nothing leaves the browser

All state (name, priorities, notes, cached weather, background and quote) is written
to `chrome.storage.local`, with a `localStorage` fallback. There is no account, no
analytics, no telemetry and no third-party script. Nothing the user types is
transmitted anywhere.

### Personal data — present, intentional, and low-risk

| Item | Location | Assessment |
| --- | --- | --- |
| Author's real name | `LICENSE` (MIT copyright line) | Standard and intended for an MIT licence |
| `DEFAULT_NAME = "Emily"` | `js/newtab.js` | The default greeting; editable in the UI. A first name only |
| Lisbon coordinates (`38.7223, -9.1393`) | `js/weather.js` | **Lisbon city centre, not a home address.** Reveals city-level location only |

These are deliberate choices for a personal project rather than leaks. Anyone forking
the project would change the name and coordinates; both are documented as
configuration points in the README.

### Repository hygiene — clean

- No OS files, caches, `node_modules/` or build output tracked.
- `.DS_Store` is ignored and not tracked.
- No dependencies at all: no package manager, no build step, no third-party code.
- Working tree clean.

## Issues found and fixed

No issues required fixing in this project. The repository-wide fixes applied in the
same pass were:

| Issue | Fix |
| --- | --- |
| Repository had no licence at its root | Added MIT `LICENSE` at the repository root (this project already carried its own) |

## Remaining limitations

- **Background images are hot-linked from Unsplash** rather than bundled. The photos
  remain the copyright of their photographers; they are used under the Unsplash
  licence and credited in the README. Nothing is redistributed in this repository.
- **No automated tests**, so nothing mechanically verifies that the storage layer
  behaves as documented.
- **The extension is unpacked and unsigned.** It is loaded via Developer mode rather
  than the Chrome Web Store, so it has no signature a user could verify.
- **Finding no secrets does not prove the project is safe.** The searches look for
  known patterns; a credential in an unusual format could evade them.
- **Repository-level GitHub settings were not inspected**: visibility, collaborators,
  Actions secrets and branch protection are outside what can be checked from the
  working tree.
