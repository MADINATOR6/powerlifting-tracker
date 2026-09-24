# Task

<!-- Temporary state for complex or risky tasks. May be overwritten per task after checking it holds no uncommitted manual edits. Reference paths; do not paste files. -->

## Goal
<!-- What must be accomplished. -->
Milestone 1 of the Powerlifting Tracker PWA (see AGENTS.md → Project): the smallest installable, offline-capable app shell that logs squat, bench and deadlift sets (weight × reps), shows the estimated 1RM after each save, persists sets in IndexedDB, and exports all data to a JSON file.

## Relevant Files
<!-- Only likely relevant files/directories. -->
All new, at the repo root:
- `index.html`: single page. Links `style.css`, `manifest.json`, loads `app.js` (plain `<script defer>`, no modules needed).
- `app.js`: UI wiring, e1RM math, IndexedDB access, JSON export, service worker registration.
- `style.css`: mobile-first dark theme.
- `manifest.json`: PWA manifest.
- `service-worker.js`: offline cache for the app shell.
- `icons/icon-192.png`, `icons/icon-512.png`: simple placeholder icons (solid dark background, "PL" or a barbell glyph in a light colour). Create them with a one-off PowerShell `System.Drawing` snippet run by hand; do not commit the snippet.

## Constraints
<!-- Important requirements and things that must not change. -->
- Vanilla HTML/CSS/JS only. No `package.json`, `node_modules`, npm/npx, frameworks, bundlers, CDNs or external network requests of any kind.
- All paths relative (`./app.js`, not `/app.js`) so the app works from a GitHub Pages sub-path. Manifest `start_url` and `scope` are `./`; service worker registered as `./service-worker.js`.
- **Manifest:** `name` "Powerlifting Tracker", `short_name` "Lifts", `display` "standalone", dark `background_color` and `theme_color` matching the CSS, icons 192 and 512 PNG with `"purpose": "any"`. Add `<meta name="theme-color">` and `<meta name="viewport" content="width=device-width, initial-scale=1">` in `index.html`.
- **Service worker:** versioned cache name (e.g. `pl-shell-v1`). `install` pre-caches every shell file (html, js, css, manifest, both icons, `./`). `activate` deletes caches with other names. `fetch`: cache-first for same-origin GET requests, falling back to network. Ignore non-GET requests.
- **e1RM** (pure functions in `app.js`):
  - Epley: `weight × (1 + reps / 30)`.
  - Brzycki: `weight × 36 / (37 − reps)`.
  - When reps = 1, both return `weight` exactly.
  - Display rounded to 1 decimal place, both formulas labelled.
- **Input validation:** weight > 0 and ≤ 1000, decimals allowed; reps a whole number from 1 to 20. Invalid input shows an inline message and does not save. Weight uses `inputmode="decimal"`, reps `inputmode="numeric"`.
- **Units:** kg only in M1. Store `unit: "kg"` on every set so a later unit setting does not need a migration.
- **IndexedDB:** database `powerlifting-tracker`, version 1, object store `sets` (`keyPath: "id"`, `autoIncrement: true`) with indexes `date` and `lift`. Record shape: `{ id, lift: "squat" | "bench" | "deadlift", weight, reps, unit, date: "YYYY-MM-DD" (local date), createdAt: ISO timestamp }`. Wrap the IndexedDB request API in small promise helpers; no libraries.
- **UI (one screen, dark by default):**
  - Three large lift toggle buttons (Squat / Bench / Deadlift); the last-used lift stays selected after saving.
  - Weight and reps inputs plus one large Save button. After saving, keep the weight value and clear nothing else, so repeated sets are one tap.
  - After each save, a result panel shows that set's Epley and Brzycki e1RM.
  - Below that, today's sets (newest first) with lift, weight × reps and Epley e1RM. Loaded from IndexedDB on page load, so it survives reloads.
  - An Export to JSON button.
  - Touch targets at least 48px tall, body text at least 16px, no horizontal scroll at 360px width.
- **Export:** downloads `powerlifting-backup-YYYY-MM-DD.json` via Blob + temporary `<a download>`. Content: `{ "app": "powerlifting-tracker", "schemaVersion": 1, "exportedAt": ISO timestamp, "sets": [all records] }`, pretty-printed. This shape is the contract that M-later import must accept.
- Errors from IndexedDB or export show a visible message; no silent failures.
- Do not modify any other file. Do not commit.
- Rollback: delete the files listed above and the `icons/` folder; `git status` must then show no changes other than this TASK.md and AGENTS.md.

## Out of Scope
<!-- Adjacent work that must NOT be done. -->
- Charts, Chart.js, `vendor/` (M2).
- Body weight, measurements, body composition, training calendar (M3).
- RPE, JSON import, PR board, totals, editing or deleting sets, history beyond today, lb/unit switching, settings, light theme.
- Tests, linters, `package.json`, CI, hosting or deployment config.
- Edits to AGENTS.md, CLAUDE.md, BOOTSTRAP.md, FRICTION.md, `.codex/`, `hello.js`, `hello.test.js`.

## Done When
<!-- Concrete acceptance criteria. -->
- Served from `http://localhost:8000/`, the page loads with no console errors and the service worker reaches the "activated" state.
- Saving 100 kg × 5 on squat shows Epley 116.7 and Brzycki 112.5; 140 × 1 on deadlift shows 140.0 for both.
- Invalid inputs (empty, 0, reps 0, reps 21, reps 2.5) show a message and save nothing.
- Saved sets appear in today's list and are still there after a reload.
- Export downloads a JSON file matching the shape above, containing every saved set.
- With the server stopped (or DevTools offline), reloading still shows the app and new sets can be saved.
- Chrome DevTools → Application → Manifest shows no installability errors; both icons resolve.
- Layout works at 360px wide with no horizontal scroll.
- `git status --short` shows only the new files (plus TASK.md and AGENTS.md).

## Verify
<!-- Commands/checks proving the task works. -->
- `node --check app.js` and `node --check service-worker.js` (syntax only).
- `python -m http.server 8000` from the repo root (Python 3.13 is installed), then check the Done When items in a browser at `http://localhost:8000/`. Claude runs these in its built-in browser after Codex finishes.
- Real-device check (by the user, after hosting on GitHub Pages or Netlify): install to the home screen on the Samsung phone, then log a set in airplane mode.
- `git status --short`

Unknowns: kg vs lb as the user's main unit (M1 assumes kg and stores the unit per set). Checked: working tree clean on the current branch before this task apart from AGENTS.md; no `package.json`; Node v24.21.0 and Python 3.13.15 available.
