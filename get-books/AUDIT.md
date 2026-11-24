# Pre-publication audit — get-books

Audit of this project before publishing the repository publicly.
Date: 24 November 2026. Re-run after the fixes below were applied.

## What was checked

- Every tracked file, plus the **full Git history including deleted files**, searched
  for secret-shaped values: `service_role`, `sb_secret_*`, JWT-format keys (`eyJ…`),
  AWS access key IDs, GitHub tokens, private-key blocks, and `password=` / `secret=`
  assignments.
- Which files are tracked, untracked and ignored; whether any OS, cache, dependency
  or generated files are committed.
- `.gitignore` coverage at the repository root and in this project.
- Dependency manifests, setup instructions and configuration examples.
- README coverage of purpose, data collection, persistence, user interaction, setup,
  learning and limitations.
- What the Supabase key committed in `index.html` can actually do, tested against the
  live API.

## Findings

### Secrets and sensitive data — no leak found

| Check | Result |
| --- | --- |
| Real secret in working tree | None found |
| Real secret anywhere in Git history | None found |
| `service_role` occurrences | Placeholder text only (`"your-service_role-key"`) in documentation |
| JWT-format keys (`eyJ…`) | None, in any commit |
| Files added then deleted | None — nothing was committed and later removed |

`index.html` does contain a live Supabase **publishable** key. This is intentional and
is how the key is meant to be used: it is a browser-side key, and the project cannot
query the database from a static page without it. The secret `service_role` key is
read from an environment variable in `supabase/upload.py` and appears nowhere in the
repository.

### Verifying that the published key is actually safe

A publishable key is only safe if Row Level Security restricts what it can do, so this
was tested against the live API rather than assumed:

| Probe | Result | Conclusion |
| --- | --- | --- |
| Schema introspection (`GET /rest/v1/`) | `"Secret API key required"` | The key cannot enumerate the database |
| `GET /books` | 200 | Reads allowed, as intended |
| `GET` on eight common table names (`users`, `profiles`, `orders`, …) | 404 | No other table is reachable |
| `POST` with a NOT NULL violation | `42501 — new row violates row-level security policy` | **Inserts are blocked** |
| `PATCH` on an existing row, writing its current value back | 0 rows affected | **Updates are blocked** (RLS filtered the row out) |
| `DELETE` | not tested | Cannot be tested without destroying a row — see below |

The probes were built so they could not alter data: the insert violated a NOT NULL
constraint, and the update wrote a value identical to the existing one. Row count and
contents were verified unchanged before and after.

**Not proven: `DELETE`.** Under RLS, `UPDATE` and `DELETE` are filtered by row rather
than rejected outright, so a delete request that matches no rows returns success
whether or not a policy permits it. Proving it would require deleting a real row.
Given that inserts and updates are both blocked, deletes are very likely blocked by
the same read-only policy — but this remains **inferred, not verified**. The
definitive check is Supabase -> Authentication -> Policies -> `books`, which lists the
commands each policy covers.

### Repository hygiene — clean

- No OS files, caches, virtualenvs, dependency folders or build output are tracked.
- `.DS_Store` is present locally but correctly ignored and not tracked.
- The working tree is clean; no untracked files are pending.
- `.gitignore` covers OS cruft, editor folders, Python caches and virtualenvs,
  `node_modules/`, and `.env` / `*.env` / `secrets.*`.
- `generic_scraper.py` uses `example.com` placeholders, not a real target.

## Issues found and fixed

| Issue | Fix |
| --- | --- |
| No dependency manifest; dependencies were only named in prose | Added `requirements.txt` (`requests`, `beautifulsoup4`) |
| No configuration example for the two required environment variables | Added `.env.example` with placeholder values and a note that the service_role key is server-side only. Verified it is not caught by the `*.env` ignore rule |
| Repository had no licence at its root | Added MIT `LICENSE` at the repository root |

## Remaining limitations

- **The publishable key is permanent in Git history.** This is acceptable because it
  is a read-only browser key, but if the table's RLS policy is ever loosened, the key
  must be rotated in the Supabase dashboard — removing it from history later would not
  help, since it is already published.
- **`DELETE` permission is unverified.** It could not be proven by probe without
  destroying a row, and the policy list in the Supabase dashboard has not been
  inspected. This is the one open security question in this audit.
- **The audit covers this repository only.** It cannot tell whether a copy of the
  secret key exists elsewhere — in a shell history, an environment file outside the
  repository, or the Supabase dashboard.
- **Repository-level GitHub settings were not inspected**: visibility, collaborators,
  Actions secrets and branch protection are outside what can be checked from the
  working tree.
- **Finding no secrets does not prove the project is safe.** The searches above look
  for known patterns; a credential in an unusual format could evade them.
- The Supabase project URL and the publishable key identify a real project. That is
  unavoidable for a live demo, and the project holds nothing but public book data
  scraped from a sandbox site.
