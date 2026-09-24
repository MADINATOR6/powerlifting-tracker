# Task

<!-- Temporary state for complex or risky tasks. May be overwritten per task after checking it holds no uncommitted manual edits. Reference paths; do not paste files. -->

## Goal
<!-- What must be accomplished. -->
Milestone 4 of the Powerlifting Tracker PWA, "Anatomical Recovery Heatmap": a third screen, "Recovery", with an inline SVG body map (front and back) whose powerlifting muscle groups are coloured from red (fatigued) to green (rested). Fatigue comes from hours since each muscle group was last trained plus its weekly volume, via an exercise-to-muscle mapping. Includes a legend and a text status list.

## Relevant Files
<!-- Only likely relevant files/directories. -->
Modify only:
- `index.html`: third tab, Recovery screen markup with the two inline SVGs, legend and status list.
- `app.js`: generic screen switching, mapping, pure recovery functions, rendering.
- `style.css`: styles for the body map, legend and list.
- `service-worker.js`: cache name `pl-shell-v3` only.

## Constraints
<!-- Important requirements and things that must not change. -->
- Same rules as M1–M3: vanilla HTML/CSS/JS, no dependencies, CDNs or network requests, relative paths, plain `<script defer>`. No new SVG/image files: the body map is inline `<svg>` in `index.html`. Keep every M1–M3 behaviour working unchanged. No IndexedDB schema or version change.
- **Screens:** add a third tab button "Recovery" (`data-screen="recovery"`) after Analyst and `<div id="screen-recovery" hidden>` after `#screen-analyst`. Replace the current two-screen tab handler with a generic one: the clicked tab's `#screen-<name>` is shown, all other screens hidden, `aria-pressed` updated on all tabs, `#message` placed at the top of the active screen (Log keeps its current position after the form). Opening Analyst still calls `renderAnalyst()`; opening Recovery calls `renderRecovery()`; leaving Analyst still invalidates a pending analyst render. Re-render on every open.
- **Muscle groups** (keys and labels, in this display order): `quads` Quads, `hamstrings` Hamstrings, `glutes` Glutes, `lower-back` Lower back, `chest` Chest, `triceps` Triceps, `front-delts` Front delts, `upper-back` Upper back. Store as a `MUSCLES` constant.
- **Exercise-to-muscle mapping** `EXERCISE_MUSCLES` (factor 1 = primary, 0.5 = secondary). Only squat/bench/deadlift can be logged today; the accessory keys are ready for a later accessory logger. Records whose `lift` is not a key are ignored.
  - `squat`: quads 1, glutes 1, lower-back 0.5, hamstrings 0.5
  - `bench`: chest 1, triceps 0.5, front-delts 0.5
  - `deadlift`: hamstrings 1, glutes 1, lower-back 1, upper-back 0.5, quads 0.5
  - `front-squat`: quads 1, glutes 0.5, upper-back 0.5 · `pause-squat`: same as squat · `romanian-deadlift`: hamstrings 1, glutes 0.5, lower-back 0.5 · `good-morning`: hamstrings 1, lower-back 1, glutes 0.5 · `close-grip-bench`: triceps 1, chest 0.5, front-delts 0.5 · `overhead-press`: front-delts 1, triceps 0.5 · `dip`: triceps 1, chest 0.5, front-delts 0.5 · `barbell-row`: upper-back 1, lower-back 0.5 · `pull-up`: upper-back 1 · `leg-press`: quads 1, glutes 0.5 · `hip-thrust`: glutes 1, hamstrings 0.5 · `back-extension`: lower-back 1, glutes 0.5, hamstrings 0.5
- **Pure functions in `app.js`** (no DOM/storage access):
  - `muscleRecovery(records, now)`: `now` is a ms timestamp; each record's time is `Date.parse(record.createdAt)`; ignore records with an invalid `createdAt` or a time after `now`. For every muscle key return `{ hoursSince, weeklySets, recoveryHours, fatigue }`:
    - `hoursSince` = hours from the latest record hitting that muscle (factor > 0) to `now`, or `null` if none.
    - `weeklySets` = Σ factor over records hitting it with time > `now − 7 × 24 h`.
    - `recoveryHours` = `48 + 4 × min(weeklySets, 12)` (48 h to 96 h).
    - `fatigue` = `0` when `hoursSince` is `null`, else `clamp(1 − hoursSince / recoveryHours, 0, 1)`.
  - `fatigueColour(fatigue)`: `` `hsl(${Math.round(120 * (1 - fatigue))}, 70%, 45%)` `` (1 → red hue 0, 0 → green hue 120).
- **Body map markup** (inside `#screen-recovery`, under `<h2>Recovery</h2>` and a one-line intro "Red is fatigued, green is rested. Based on hours since each muscle group was trained and this week's volume."):
  - A `<div class="body-maps">` holding two `<figure>`s, each with an inline `<svg>` (`viewBox="0 0 120 260"`, `role="img"`, `aria-label="Front body map"` / `"Back body map"`) and a `<figcaption>` "Front" / "Back".
  - Each SVG draws a simple neutral body silhouette (head, neck, torso, arms, legs; fill `#263242`, stroke `#718096`) and on top the muscle regions as simple shapes (`<path>`, `<ellipse>` or `<rect rx>`), each with `class="muscle"`, `data-muscle="<key>"` and a `<title>` with the label. Left/right pairs are two shapes with the same `data-muscle`.
  - Front view: `chest`, `front-delts`, `quads`. Back view: `upper-back`, `lower-back`, `glutes`, `hamstrings`, `triceps`. Every one of the 8 keys appears at least once; regions sit anatomically plausibly (e.g. quads on the front thighs, hamstrings on the back thighs).
  - Both figures side by side at 360px width (each ≤ 50% wide, scaling with `width: 100%; height: auto`), no horizontal scroll.
- **Legend** `<div class="legend">`: a horizontal bar with `linear-gradient(to right, hsl(0, 70%, 45%), hsl(60, 70%, 45%), hsl(120, 70%, 45%))` and labels "Fatigued" (left) and "Rested" (right).
- **Status list** `<ul id="recovery-list">`: one `<li data-muscle="<key>">` per muscle in `MUSCLES` order, text:
  - trained: `Quads: 60% fatigued · last trained 24 h ago · 3 sets this week` — percent = `Math.round(fatigue × 100)`; time = `Math.round(hoursSince)` + ` h ago` when `hoursSince < 48`, else `Math.floor(hoursSince / 24)` + ` d ago`; sets = `weeklySets` with at most 1 decimal and no trailing `.0` (`1.5`, `3`, `0`).
  - never trained: `Chest: rested · no sets logged`.
  - each item starts with a small colour swatch (`<span class="swatch">`) filled with that muscle's colour.
- **renderRecovery():** reads all sets (existing `readSets()`), computes `muscleRecovery(records, Date.now())`, sets the `fill` attribute of every `[data-muscle]` SVG shape to `fatigueColour(fatigue)`, and renders the list. Storage errors show the existing visible message.
- **Service worker:** `CACHE = "pl-shell-v3"` (shell files changed). No other SW changes.
- Layout: touch targets ≥ 48px tall (three tabs fit in one row at 360px), body text ≥ 16px, no horizontal scroll at 360px on any screen.
- Do not modify `vendor/`, `manifest.json`, icons or any file not listed above. Do not commit.
- Rollback: `git checkout -- index.html app.js style.css service-worker.js`.

## Out of Scope
<!-- Adjacent work that must NOT be done. -->
- Logging accessory exercises (lift picker changes), per-muscle charts, deload advice, meet-day tools (M5).
- RPE- or intensity-weighted fatigue, user-editable recovery times, notifications.
- JSON import, editing or deleting sets. Tests, linters, `package.json`, CI. Edits to AGENTS.md, CLAUDE.md, BOOTSTRAP.md, FRICTION.md, TASK.md, `.codex/`, `vendor/`.

## Done When
<!-- Concrete acceptance criteria. -->
- Served from `http://localhost:8000/`: no console errors; service worker activated with only the `pl-shell-v3` cache; every resource same-origin.
- Three tabs (Log, Analyst, Recovery) switch screens with exactly one visible; all M1–M3 checks still pass (log/RPE/coach, PR board and charts).
- Empty database: every muscle shape is `hsl(120, 70%, 45%)` and every list item reads `<Label>: rested · no sets logged`.
- With only 3 squat sets whose `createdAt` is 24 h before now: Quads and Glutes `60% fatigued · last trained 24 h ago · 3 sets this week`, fill `hsl(48, 70%, 45%)`; Hamstrings and Lower back `56% fatigued · last trained 24 h ago · 1.5 sets this week`, fill `hsl(53, 70%, 45%)`; the other four rested.
- A deadlift set 80 h ago (no other sets): Lower back `0% fatigued · last trained 3 d ago · 1 sets this week`; a squat set 8 days ago counts for "last trained" but not for weekly sets.
- All 8 muscle keys appear as `[data-muscle]` shapes in the SVGs (front: chest, front-delts, quads; back: the other five).
- The legend shows the red→green gradient with "Fatigued" and "Rested".
- Offline reload still shows the Recovery screen.
- No horizontal scroll at 360px on any screen.
- `git status --short` shows only `index.html`, `app.js`, `style.css`, `service-worker.js` modified (plus TASK.md and AGENTS.md).

## Verify
<!-- Commands/checks proving the task works. -->
- `node --check app.js` and `node --check service-worker.js`.
- `python -m http.server 8000` from the repo root, then the Done When items in headless Chrome at 360×780 (Claude runs these after Codex finishes, seeding records with chosen `createdAt` values).
- `git status --short`

Commit message: `Add Milestone 4: recovery heatmap with SVG body map`

Unknowns: the fatigue model (48–96 h window scaled by weekly sets) is a simple heuristic, not a validated recovery model. Checked: M3 committed at a32aab9; every stored set has `createdAt` since M1.
