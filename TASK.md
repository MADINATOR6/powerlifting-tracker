# Task

<!-- Temporary state for complex or risky tasks. May be overwritten per task after checking it holds no uncommitted manual edits. Reference paths; do not paste files. -->

## Goal
<!-- What must be accomplished. -->
Milestone 5 of the Powerlifting Tracker PWA, "Meet-Day Tools": a fourth screen, "Meet", with an attempt calculator (gym maxes → opener/second/third for conservative, standard and aggressive strategies), a warm-up protocol generated from the chosen openers, and a weight-class manager that tracks bodyweight against a target IPF class.

## Relevant Files
<!-- Only likely relevant files/directories. -->
Modify only:
- `index.html`: fourth tab, Meet screen markup.
- `app.js`: pure meet functions, meet settings persistence, rendering, tab wiring.
- `style.css`: styles for the Meet screen only.
- `service-worker.js`: cache name `pl-shell-v4` only.

## Constraints
<!-- Important requirements and things that must not change. -->
- Same rules as M1–M4: vanilla HTML/CSS/JS, no dependencies, CDNs or network requests, relative paths, plain `<script defer>`. Keep every M1–M4 behaviour working unchanged. **No IndexedDB schema or version change; the JSON export is unchanged.**
- **Screens:** add a fourth tab "Meet" (`data-screen="meet"`) after Recovery and `<div id="screen-meet" hidden>` after `#screen-recovery`, using the existing generic screen switching. Opening Meet calls `renderMeet()`. All four tabs fit one row at 360px with ≥ 48px height.
- **Meet data** persists in `localStorage` key `powerlifting-tracker-meet` as JSON `{ "maxes": { "squat": n|null, "bench": n|null, "deadlift": n|null }, "strategy": "conservative"|"standard"|"aggressive", "division": "men"|"women", "weightClass": "83", "bodyweights": [{ "date": "YYYY-MM-DD", "kg": n }] }`. Defaults: maxes null, strategy `standard`, division `men`, weightClass `83` (women default `63`), bodyweights `[]`. Wrap reads/writes in try/catch like the M2 settings; invalid or unreadable JSON falls back to defaults; a failed write shows a visible message. Changes apply immediately and survive a reload.
- **Pure functions in `app.js`** (no DOM/storage access; reuse the existing `floorToIncrement`):
  - `ATTEMPT_PERCENTS = { conservative: [0.88, 0.94, 0.98], standard: [0.91, 0.96, 1.00], aggressive: [0.93, 0.98, 1.025] }`.
  - `attemptPlan(max, strategy)`: `[opener, second, third]`, each `floorToIncrement(max × pct)`; then each attempt is raised to at least the previous attempt + 2.5.
  - `WARMUP_STEPS = [[0.40, 5], [0.55, 3], [0.70, 2], [0.80, 1], [0.90, 1]]` (fraction of opener, reps). `warmupSets(opener)`: for each step `{ weight: max(20, floorToIncrement(opener × fraction)), reps }`; drop a step whose weight is ≥ the opener or equal to the previous kept step's weight.
  - `WEIGHT_CLASSES = { men: ["59", "66", "74", "83", "93", "105", "120", "120+"], women: ["47", "52", "57", "63", "69", "76", "84", "84+"] }` (IPF, kg).
  - `classStatus(bodyweight, weightClass)`: for a `"+"` class `{ limit: null, diff: null }`; else `{ limit: Number(weightClass), diff: bodyweight − limit }` (positive = over).
- **Attempt calculator** (`<section id="attempts">`, heading "Attempt calculator"):
  - Three weight inputs "Squat max (kg)", "Bench max (kg)", "Deadlift max (kg)" (`inputmode="decimal"`, valid > 0 and ≤ 1000, decimals allowed; invalid shows an inline message and is not saved; empty clears that max).
  - A "Use my best e1RMs" button filling each max from `prBoard(await readSets())` best e1RM rounded to 1 decimal (lifts with no sets keep their current value), then saving.
  - Strategy toggle: three buttons Conservative / Standard / Aggressive (`data-strategy`, `aria-pressed`, ≥ 48px).
  - `<table id="attempt-table">`: columns Lift | Opener | Second | Third; one row per lift with a max (`180 kg` etc., weights without trailing zeros), lifts without a max show `—`. A final line `#attempt-total`: `Projected total: 590 kg` (Σ thirds) when all three maxes are set, else `Projected total: enter all three maxes.`
- **Warm-up protocol** (`<section id="warmups">`, heading "Warm-ups"): for each lift with a max, one `<li>` in `#warmup-list`: `Squat · opener 180 kg: 70×5 · 97.5×3 · 125×2 · 142.5×1 · 160×1`, derived from the selected strategy's opener. With no maxes: `Enter a max to see warm-ups.`
- **Weight class manager** (`<section id="weight-class">`, heading "Weight class"):
  - Division select (Men / Women) and class select filled from `WEIGHT_CLASSES` (options shown as `83 kg`, `120+ kg`). Changing division resets the class to its default (men `83`, women `63`).
  - Bodyweight input (kg, `inputmode="decimal"`, valid 20–300) and a "Log bodyweight" button: stores `{ date: localDate(), kg }`, replacing any entry for the same date; invalid input shows an inline message and saves nothing.
  - `#class-status` for the latest entry (by date): `83 kg class: 85.2 kg on 2026-09-24, 2.2 kg over the limit.` / `…, 1.3 kg under the limit.` / `…, exactly at the limit.` (diff to 1 decimal, compared after rounding to 1 decimal); for a `+` class: `120+ kg class: 125.0 kg on 2026-09-24, no upper limit.`; with no entries: `Log your bodyweight to track your class.` Bodyweights shown with 1 decimal.
  - `<ul id="bodyweight-list">`: the 5 most recent entries, newest first, `2026-09-24 · 85.2 kg`.
- **Service worker:** `CACHE = "pl-shell-v4"`. No other SW changes.
- Layout: touch targets ≥ 48px, body text ≥ 16px, no horizontal scroll at 360px on any screen.
- Do not modify `vendor/`, `manifest.json`, icons or any file not listed above. Do not commit.
- Rollback: `git checkout -- index.html app.js style.css service-worker.js`.

## Out of Scope
<!-- Adjacent work that must NOT be done. -->
- Bodyweight in IndexedDB or in the JSON export (follow-up), lb units, other federations' classes, DOTS/Wilks scores, meet timers, attempt cards, plate-loading charts.
- Changes to the Log, Analyst or Recovery screens. Tests, linters, `package.json`, CI. Edits to AGENTS.md, CLAUDE.md, BOOTSTRAP.md, FRICTION.md, TASK.md, `.codex/`, `vendor/`.

## Done When
<!-- Concrete acceptance criteria. -->
- Served from `http://localhost:8000/`: no console errors; service worker activated with only the `pl-shell-v4` cache.
- Four tabs switch screens with exactly one visible; all M1–M4 checks still pass.
- Maxes squat 200, bench 140, deadlift 250:
  - Standard: squat `180 / 190 / 200`, bench `125 / 132.5 / 140`, deadlift `227.5 / 240 / 250`; `Projected total: 590 kg`.
  - Conservative squat `175 / 187.5 / 195`; Aggressive squat `185 / 195 / 205`.
  - Warm-ups (standard): `Squat · opener 180 kg: 70×5 · 97.5×3 · 125×2 · 142.5×1 · 160×1`; `Bench · opener 125 kg: 50×5 · 67.5×3 · 87.5×2 · 100×1 · 112.5×1`.
  - Values and strategy survive a reload.
- `warmupSets(40)` gives `20×5 · 27.5×2 · 30×1 · 35×1` (the 55% step equals 20 and is dropped as a duplicate).
- "Use my best e1RMs" with a logged squat 100×5 sets the squat max to 116.7.
- Men / 83: logging 85.2 shows `83 kg class: 85.2 kg on <today>, 2.2 kg over the limit.`; logging 81.7 the same day replaces it (`1.3 kg under the limit.`, one list entry); class `120+` shows `no upper limit`. Invalid bodyweight (10, 301, empty) shows a message and saves nothing.
- `Projected total: enter all three maxes.` whenever any max is missing.
- Offline reload still shows the Meet screen.
- No horizontal scroll at 360px on any screen.
- `git status --short` shows only `index.html`, `app.js`, `style.css`, `service-worker.js` modified (plus TASK.md and AGENTS.md).

## Verify
<!-- Commands/checks proving the task works. -->
- `node --check app.js` and `node --check service-worker.js`.
- `python -m http.server 8000` from the repo root, then the Done When items in headless Chrome at 360×780 (Claude runs these after Codex finishes).
- `git status --short`

Commit message: `Add Milestone 5: meet-day attempt, warm-up and weight-class tools`

Unknowns: attempt and warm-up percentages are common coaching heuristics, not federation rules. Bodyweight history lives in localStorage and is not yet in the JSON export. Checked: M4 committed at 1a57e1e; IPF class limits as listed.
