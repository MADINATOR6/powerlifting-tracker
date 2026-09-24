# Task

<!-- Temporary state for complex or risky tasks. May be overwritten per task after checking it holds no uncommitted manual edits. Reference paths; do not paste files. -->

## Goal
<!-- What must be accomplished. -->
Milestone 3 of the Powerlifting Tracker PWA, "Analyst Dashboard": a second screen with a PR board (per-lift PRs plus total), an e1RM-over-time line chart, a weekly tonnage bar chart and a squat/bench/deadlift imbalance radar, drawn with the locally vendored Chart.js. Bump the service worker cache to `pl-shell-v2` so installed apps pick up M2 and M3.

## Relevant Files
<!-- Only likely relevant files/directories. -->
Modify only:
- `index.html`: screen tabs, Analyst screen markup, load `./vendor/chart.umd.min.js`.
- `app.js`: tab switching, pure analytics functions, PR board and chart rendering.
- `style.css`: styles for tabs, PR board, chart boxes.
- `service-worker.js`: cache name `pl-shell-v2` and the vendored script in the shell list.

Already added by Claude, do not modify: `vendor/chart.umd.min.js` (Chart.js v4.5.1 UMD build, sets `window.Chart`; npm tarball integrity verified), `vendor/chart.js-LICENSE.md`.

## Constraints
<!-- Important requirements and things that must not change. -->
- Same rules as M1/M2: vanilla HTML/CSS/JS, no `package.json`, npm/npx, frameworks, bundlers, CDNs or network requests. Relative paths. Plain `<script defer>` tags, no modules. Keep every M1 and M2 behaviour working unchanged (logging, validation, e1RM, today's list, RPE, coach, settings, export, offline).
- **Chart.js loading:** add `<script defer src="./vendor/chart.umd.min.js"></script>` immediately before the existing `app.js` script tag (defer keeps order). If `window.Chart` is missing at render time, the Analyst screen shows "Charts are unavailable." in place of the charts and the PR board still renders. Use only Chart.js's built-in category/linear/radial scales (no time scale, no date adapter, no plugins).
- **Screens:** under the `<h1>`, a `<nav class="tabs">` with two buttons, "Log" and "Analyst" (`data-screen="log"` / `data-screen="analyst"`, `aria-pressed` like the lift toggles, ≥ 48px tall). Wrap all existing content below the nav (intro paragraph through Settings) in `<div id="screen-log">`. Add `<div id="screen-analyst" hidden>`. Exactly one screen is visible; the app opens on Log. Opening Analyst reads all sets from IndexedDB (existing `readSets()`) and re-renders the PR board and all three charts every time, destroying previous Chart instances first (`chart.destroy()`). Storage errors show the existing visible message.
- **Analyst screen content, in this order:** `<h2>PR board</h2>` + `#pr-board`; `<h2>e1RM over time</h2>` + canvas `#e1rm-chart`; `<h2>Weekly tonnage</h2>` + canvas `#tonnage-chart`; `<h2>Lift balance</h2>` + `#balance-note` + canvas `#balance-chart`. Each canvas sits in its own `<div class="chart-box">` (fixed height 260px, `position: relative`) with `role="img"` and a short `aria-label`. With no sets at all, show `#analyst-empty` "No sets logged yet. Log a set to see your analysis." and hide the PR board and chart sections.
- **Pure functions in `app.js`** (no DOM, storage or Chart access). Use Epley (existing `epley()`) for every e1RM. Dates are the stored local `"YYYY-MM-DD"` strings:
  - `weekStart(date)`: the Monday (`"YYYY-MM-DD"`) of the week containing `date`, computed with local `new Date(y, m - 1, d)` (no UTC parsing).
  - `dailyBestE1rm(records)`: `{ labels, series }` where `labels` = all distinct dates ascending and `series.squat|bench|deadlift` = per label the best e1RM that day for that lift rounded to 1 decimal, or `null` when that lift has no set that day.
  - `weeklyTonnage(records, today, weeks = 8)`: `labels` = the `weeks` Monday dates ending with `weekStart(today)`, ascending; `series.<lift>` = per week Σ `weight × reps` for that lift, 0 when none. Records outside the window are ignored.
  - `prBoard(records)`: per lift `null` when the lift has no sets, else `{ bestE1rm, bestSet, heaviestSet }` where `bestSet` is the set with the highest e1RM and `heaviestSet` the set with the highest weight (ties: the earlier date wins; each set as `{ weight, reps, date }`). Plus `total`: `null` unless all three lifts have sets, else `{ e1rm: Σ bestE1rm, heaviest: Σ heaviestSet.weight }`. Keep values unrounded; round only for display.
  - `TYPICAL_SHARE = { squat: 35, bench: 25, deadlift: 40 }` (% of total, rule-of-thumb constants). `liftShares(prs)`: `null` unless `prs.total`, else `{ squat, bench, deadlift }` = `bestE1rm / total.e1rm × 100` (unrounded).
- **PR board** (`#pr-board`, a `<table>`: columns Lift | Best e1RM | Heaviest set; one row per lift in Squat, Bench, Deadlift order, then a Total row):
  - Lift cell text e.g. `Squat`. Best e1RM cell: `165.0 kg (150 × 3, 2026-09-22)`. Heaviest set cell: `150 kg × 3 (2026-09-22)`. A lift with no sets shows `—` in both cells.
  - Total row: `495.0 kg` e1RM total and `450 kg` heaviest total, or `—` in both unless all three lifts have sets. e1RM values always with 1 decimal; weights as stored (no trailing zeros).
  - Must fit 360px width without horizontal scroll (smaller font in the table is fine, not below 14px).
- **e1RM chart** (`type: "line"`): `labels` from `dailyBestE1rm`, one dataset per lift (label "Squat"/"Bench"/"Deadlift"), `spanGaps: true`, y-axis title "e1RM (kg)".
- **Tonnage chart** (`type: "bar"`): labels from `weeklyTonnage(records, localDate())` (8 weeks), one dataset per lift, y-axis title "kg lifted (weight × reps)".
- **Balance radar** (`type: "radar"`): labels `["Squat", "Bench", "Deadlift"]`, dataset "You" = `liftShares` rounded to 1 decimal, dataset "Typical" = `TYPICAL_SHARE`; radial scale `min: 0`, `max: 50`. When `liftShares` is `null`, hide the chart box and set `#balance-note` to `Log squat, bench and deadlift to see your balance.` Otherwise `#balance-note` names the lift with the largest absolute gap `share − typical`: `Deadlift is 3.1 points above the typical share (40%).` / `Bench is 4.0 points below the typical share (25%).`; when every gap is < 2 points: `Balanced: every lift is within 2 points of the typical share.`
- **Chart styling:** dark theme. Colours: squat `#a3e6ba`, bench `#7cc4fa`, deadlift `#f4cc79`, "Typical" `#a0aec0` with a dashed border. Set `Chart.defaults.color = "#edf2f7"` and `Chart.defaults.borderColor = "#2d3a4a"` once. All charts: `responsive: true`, `maintainAspectRatio: false`, `animation: false`, legend at the bottom.
- **Service worker:** `CACHE = "pl-shell-v2"`; add `"./vendor/chart.umd.min.js"` to `SHELL`. No other SW changes (activate already deletes old caches).
- Layout: touch targets ≥ 48px tall, body text ≥ 16px, no horizontal scroll at 360px on either screen.
- Do not modify `vendor/`, `manifest.json`, icons or any file not listed above. Do not commit.
- Rollback: `git checkout -- index.html app.js style.css service-worker.js`.

## Out of Scope
<!-- Adjacent work that must NOT be done. -->
- Recovery body map (M4), meet-day tools (M5), deload logic.
- Chart.js time scale, date adapters, plugins, zoom/pan, date-range pickers, per-muscle tonnage, RPE-adjusted e1RM, lb units.
- JSON import, editing or deleting sets, history lists beyond today.
- Tests, linters, `package.json`, CI, hosting config. Edits to AGENTS.md, CLAUDE.md, BOOTSTRAP.md, FRICTION.md, TASK.md, `.codex/`, `vendor/`.

## Done When
<!-- Concrete acceptance criteria. -->
- Served from `http://localhost:8000/`: no console errors; the service worker is activated with only the `pl-shell-v2` cache, which contains `vendor/chart.umd.min.js`; `Chart.version` is `4.5.1`; every loaded resource is same-origin.
- App opens on Log; the tabs switch screens, exactly one visible; all M1/M2 checks still pass.
- Empty database: Analyst shows the "No sets logged yet" message and no charts.
- With sets squat 140×3 (2026-09-21), squat 150×3 (2026-09-22), bench 100×5 (2026-09-21), deadlift 200×2 (2026-09-15), deadlift 180×1 (2026-09-22) and today = 2026-09-24:
  - PR board: Squat `165.0 kg (150 × 3, 2026-09-22)` / `150 kg × 3 (2026-09-22)`; Bench `116.7 kg (100 × 5, 2026-09-21)` / `100 kg × 5 (2026-09-21)`; Deadlift `213.3 kg (200 × 2, 2026-09-15)` / `200 kg × 2 (2026-09-15)`; Total `495.0 kg` / `450 kg`.
  - e1RM chart labels `2026-09-15, 2026-09-21, 2026-09-22`; squat data `[null, 154, 165]`; deadlift `[213.3, null, 180]`.
  - Tonnage chart: 8 labels ending `2026-09-14, 2026-09-21`; week 2026-09-21: squat 870, bench 500, deadlift 180; week 2026-09-14: deadlift 400.
  - Balance note: `Deadlift is 3.1 points above the typical share (40%).`; radar "You" data `[33.3, 23.6, 43.1]`.
- With only squat sets: PR board shows `—` for bench, deadlift and total; balance chart hidden with the "Log squat, bench and deadlift" note.
- Switching Analyst → Log → Analyst after saving a new set shows the new set in the PR board/charts, with no "Canvas is already in use" error.
- Offline (server stopped or DevTools offline): reload shows the app and the Analyst charts still render.
- No horizontal scroll at 360px on either screen.
- `git status --short` shows only `index.html`, `app.js`, `style.css`, `service-worker.js` modified plus `vendor/` (added by Claude), TASK.md and AGENTS.md.

## Verify
<!-- Commands/checks proving the task works. -->
- `node --check app.js` and `node --check service-worker.js`.
- `python -m http.server 8000` from the repo root, then the Done When items in headless Chrome at 360×780 (Claude runs these after Codex finishes; records are seeded into the `sets` store from the page context).
- `git status --short`

Commit message: `Add Milestone 3: analyst dashboard with vendored Chart.js`

Unknowns: `TYPICAL_SHARE` is a rule-of-thumb split, not a federation standard. Checked: M2 committed at f3e0aae; Chart.js 4.5.1 tarball sha512 matched the npm registry integrity; vendored file sha256 48444A82D4EDCB5BEC0F1965FAACDDE18D9C17DB3063D042ABADA2F705C9F54A.
