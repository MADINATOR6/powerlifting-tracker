# Task

<!-- Temporary state for complex or risky tasks. May be overwritten per task after checking it holds no uncommitted manual edits. Reference paths; do not paste files. -->

## Goal
<!-- What must be accomplished. -->
Milestone 2 of the Powerlifting Tracker PWA, "Intelligent Coach (core)": optional per-set RPE logging behind a setting (default off), a smart double-progression target for the selected lift based on its last session, and an RPE autoregulation prototype that drops the next set's suggested weight by 5% after a set logged at RPE 9 or higher. Builds on the Milestone 1 logger already in `index.html`, `app.js`, `style.css`.

## Relevant Files
<!-- Only likely relevant files/directories. -->
Modify only:
- `index.html`: RPE field in the set form, a Coach section, a Settings section.
- `app.js`: settings persistence, RPE capture, pure coach functions, rendering.
- `style.css`: styles for the new elements only.

Read for context, do not modify: `service-worker.js`, `manifest.json`, `AGENTS.md`.

## Constraints
<!-- Important requirements and things that must not change. -->
- Same rules as M1: vanilla HTML/CSS/JS, no `package.json`, npm/npx, frameworks, bundlers, CDNs or network requests. Relative paths. Keep the existing plain `<script defer>` (no modules). Keep all M1 behaviour (validation, e1RM, today's list, export, offline) working unchanged.
- **Settings** (new `<details>` section titled "Settings", below the Export button, collapsed by default):
  - Checkbox "Log RPE for each set", default **off**.
  - Rep range per lift (Squat, Bench, Deadlift): a min and a max reps number input each (`inputmode="numeric"`). Defaults 3–5 for all three lifts. Valid: whole numbers 1–20 and min ≤ max. Invalid input shows an inline message and keeps the last valid value (not saved).
  - Persist in `localStorage` under key `powerlifting-tracker-settings` as JSON `{ "rpeEnabled": boolean, "repRanges": { "squat": { "min": n, "max": n }, "bench": {...}, "deadlift": {...} } }`. Wrap every `localStorage` read/write in try/catch; on failure or bad JSON fall back to defaults and show a visible message on write failure. Settings apply immediately (no reload needed) and survive a reload.
  - Do not add an IndexedDB store or bump the IndexedDB version for settings.
- **RPE input:**
  - A `<select id="rpe">` labelled "RPE", placed after Reps in the set form. Options: `""` shown as "—" (not recorded, default), then 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, each shown with its RIR, e.g. "8 · 2 RIR", "9.5 · 0.5 RIR", "10 · 0 RIR" (RIR = 10 − RPE).
  - The field (label + select) is hidden when the setting is off and shown when on.
  - Record shape stays as M1, plus an optional numeric `rpe`. Add `rpe` to the record **only** when the setting is on and a value other than "—" is chosen; otherwise the record has no `rpe` key. No IndexedDB version bump; export `schemaVersion` stays 1 (the field is optional and additive).
  - After a save, reset the RPE select to "—". Weight and reps keep M1 behaviour.
  - Where RPE exists, show it: the result panel text and today's list items append ` @ RPE 9` (the stored value, e.g. `@ RPE 8.5`) after `weight kg × reps`.
- **Pure coach functions in `app.js`** (no DOM or storage access inside them):
  - `INCREMENTS = { squat: 5, bench: 2.5, deadlift: 5 }` (kg, constants, not user-editable).
  - `floorToIncrement(value, step = 2.5)`: rounds down to the nearest multiple of `step`, tolerant of float error (e.g. 95 stays 95).
  - `sessionSuggestion(records, lift, today, range)`: `records` are set records, `today` is `"YYYY-MM-DD"`, `range` is `{ min, max }`. Consider only records of `lift` with `date < today`. "Last session" = the latest such date. Return `null` when there is none. Otherwise return `{ date, total, hitTop, baseWeight, suggestedWeight, increase }` where `total` = number of that lift's sets on that date, `hitTop` = how many of them have `reps >= range.max`, `baseWeight` = heaviest weight among them, `increase` = `hitTop === total`, `suggestedWeight` = `baseWeight + INCREMENTS[lift]` when `increase`, else `baseWeight`. ALL sets of that lift on that date count (no warm-up filtering).
  - `nextSetSuggestion(weight, rpe)`: when `rpe` is a number `>= 9`, return `{ dropped: true, weight: floorToIncrement(weight * 0.95) }`; otherwise `{ dropped: false, weight }`.
- **Coach section** (`<section id="coach" aria-live="polite">`, heading "Coach", placed between the form/message and the result panel):
  - `#session-target` always shows the double-progression line for the currently selected lift, re-rendered on load, when the lift toggle changes, and when that lift's rep range changes. Use this exact wording (lift name capitalised as in M1, weights formatted without trailing zeros, e.g. `102.5`, `145`):
    - No previous session: `Squat: no earlier session yet. Pick a weight you can lift for 3–5 reps.`
    - Increase: `Squat: last session 2026-09-20, all 3 sets reached 5 reps. Increase to 145 kg.`
    - Stay: `Squat: last session 2026-09-20, 2 of 3 sets reached 5 reps. Stay at 140 kg until every set does.`
  - `#next-set` (hidden by default): after a save whose `nextSetSuggestion` returns `dropped: true`, show `Next set: 132.5 kg (RPE 9 on 140 kg, −5%).` and set the weight input to the suggested weight. After a save with `dropped: false`, or when the lift toggle changes, hide it.
  - Read the lift's records for `sessionSuggestion` from IndexedDB via the existing `lift` index (add a small helper next to `readSets`). Storage errors show a visible message, no silent failures.
- Layout: touch targets ≥ 48px tall (checkbox row included), body text ≥ 16px, no horizontal scroll at 360px width. The 6 rep-range inputs must fit at 360px (e.g. one row per lift: name, min, max).
- Do not modify `service-worker.js` (the cache bump to `pl-shell-v2` is Milestone 3), `manifest.json`, icons or any file not listed above. Do not commit.
- Rollback: `git checkout -- index.html app.js style.css` restores M1.

## Out of Scope
<!-- Adjacent work that must NOT be done. -->
- Charts, Chart.js, `vendor/`, PR board, analytics (M3). Body map, recovery (M4). Meet-day tools (M5).
- Service worker or cache-name changes, manifest changes.
- Editable increments, lb units, deload logic, RPE-based e1RM, warm-up filtering, JSON import, editing or deleting sets, history beyond today.
- Tests, linters, `package.json`, CI, hosting config. Edits to AGENTS.md, CLAUDE.md, BOOTSTRAP.md, FRICTION.md, TASK.md, `.codex/`.

## Done When
<!-- Concrete acceptance criteria. -->
- Served from `http://localhost:8000/`, the page loads with no console errors and the service worker is activated.
- Fresh load: Settings is collapsed, "Log RPE" is unchecked, the RPE field is hidden, the Coach line shows the "no earlier session" wording for Squat.
- Turning "Log RPE" on shows the RPE field immediately and stays on after a reload; turning it off hides it.
- With RPE on: squat 140 × 3 at RPE 9 saves `rpe: 9`, the result and today's list show `@ RPE 9`, `#next-set` shows 132.5 kg and the weight input becomes 132.5. Then 132.5 × 3 at RPE 8.5 saves `rpe: 8.5` and hides `#next-set`. A set saved with "—" (or with the setting off) has no `rpe` key.
- With previous-day squat sets 140×5, 140×5, 140×5 (range 3–5), the Coach line reads "…all 3 sets reached 5 reps. Increase to 145 kg." With 140×5, 140×5, 140×4 it reads "…2 of 3 sets reached 5 reps. Stay at 140 kg until every set does." Previous-day bench 100×5 ×3 → "Increase to 102.5 kg". Only the latest earlier date counts; today's sets are ignored.
- Changing squat's max to 4 immediately re-renders the Coach line; min 6 / max 5, 0 or 21 shows a message and is not saved.
- M1 checks still pass: 100 × 5 squat → Epley 116.7, Brzycki 112.5; invalid weight/reps show a message and save nothing; export JSON includes every set (with `rpe` where recorded).
- Layout works at 360px wide with no horizontal scroll.
- `git status --short` shows only `index.html`, `app.js`, `style.css` modified (plus TASK.md and AGENTS.md).

## Verify
<!-- Commands/checks proving the task works. -->
- `node --check app.js` and `node --check service-worker.js`.
- `python -m http.server 8000` from the repo root, then the Done When items in a browser at `http://localhost:8000/` at 360×780. Previous-day sessions are seeded by adding records with an earlier `date` to the `sets` store from the DevTools console. Claude runs the browser checks after Codex finishes.
- `git status --short`

Commit message: `Add Milestone 2: RPE logging and coach suggestions`

Unknowns: whether the user logs warm-up sets (they count toward "all sets" per the locked spec). Checked: working tree clean on `main` at c326977; M1 files as listed; Node v24.21.0, Python 3.13.15, codex-cli 0.156.1.
