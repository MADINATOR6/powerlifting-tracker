# Project

Powerlifting Tracker: a mobile-first, offline-capable Progressive Web App for personal powerlifting tracking on a Samsung Android phone (Chrome or Samsung Internet). It is hosted from a URL (GitHub Pages or Netlify) and installed to the home screen. Do not rely on opening the HTML from OneDrive; Android's OneDrive viewer intercepts HTML files.

Planned scope, delivered in milestones:
- M1: app shell, squat/bench/deadlift set logger (weight × reps), e1RM, IndexedDB persistence, JSON export.
- M2: Chart.js progress charts (e1RM per lift over time) and weekly tonnage per muscle group.
- M3: body tracking (bodyweight, measurements, composition) and a training calendar.
- Later: RPE, JSON import, PR board with total, quick-entry polish.

Hard constraints: no build step, no framework, no `package.json`, no `node_modules`, no npm installs, no external API calls, cloud services or logins. IndexedDB is the primary store; backup and restore go through JSON files (the user keeps them in OneDrive). Dark mode by default, large touch targets.

# Stack

- Vanilla HTML, CSS and JavaScript (ES2020+, no transpiling, no bundler).
- IndexedDB via the native API for data.
- PWA: `manifest.json` (192px and 512px icons) and a service worker for offline caching.
- Chart.js, vendored locally in the repo (from M2), never loaded from a CDN.
- Static hosting only (GitHub Pages or Netlify).

# Folder Map

- `AGENTS.md`, `CLAUDE.md`, `BOOTSTRAP.md`, `FRICTION.md`, `TASK.md`, `.codex/`: workflow files from the template. Only AGENTS.md and TASK.md change for app work.
- `hello.js`, `hello.test.js`: leftover template smoke test, unrelated to the app.
- App files are created at the repo root from M1 (planned, not yet present): `index.html`, `app.js`, `style.css`, `manifest.json`, `service-worker.js`, `icons/`. A vendored Chart.js goes in `vendor/` from M2.

# Commands

Not set. Add a dev, test, lint, typecheck or build command only after it has run successfully in this repo. Never invent one.

# Windows

In PowerShell, always call `codex.cmd`, `npm.cmd` and `npx.cmd`, never plain `codex`, `npm` or `npx`. The execution policy and Codex's sandbox block the `.ps1` launchers that plain names resolve to. Keep sandbox protections intact.

# Mobile Sync

- Phone and iPad see a one-way, read-only copy of this repo in OneDrive: `C:\Users\Madison\OneDrive\AgentWorkspace\claude-codex-template` (OneDrive app → AgentWorkspace → claude-codex-template). The folder is named after the repo folder. It excludes `.git`, `node_modules`, `.env*`, `*.pem` and `*.key`.
- Save and edit files only in this repo, never in the OneDrive copy. Edits made in the copy are not synced back and get overwritten. Files deleted in the repo stay in the copy until removed there by hand.
- After each commit, Claude or the user refreshes the copy. Codex's sandbox cannot write to OneDrive. Exit codes 0–7 mean success:
  `$r = (git rev-parse --show-toplevel) -replace '/','\'; if ($env:OneDrive) { robocopy $r "$env:OneDrive\AgentWorkspace\$(Split-Path -Leaf $r)" /E /XD .git node_modules /XF .env* *.pem *.key /NFL /NDL /NJH /NJS /NP }`
- Never copy secrets or patient data. If the working tree contains any, do not run the command.

# Scope

- Single agent by default. Delegate only when it clearly helps the task.
- Make the smallest correct change. No unrelated refactors, renames, reorganisation or cleanup.
- Do not modify files unrelated to the task.
- Inspect files, config, scripts, tests and Git state before assuming. Never invent commands, paths, APIs, behaviour or business rules.
- Preserve existing architecture unless the task requires changing it.

# Routing

- Trivial (typo, simple rename, formatting, tiny isolated change): one agent → change → targeted check → commit. No plan.
- Normal and clear: Codex implements → verify → commit.
- Complex or ambiguous: Claude plans → TASK.md → Codex implements → verify → commit.
- Risky: Claude plans → TASK.md → Codex implements → automated checks → Claude reviews TASK.md, `git diff`, changed files and relevant tests → fix → final verification → commit.
- Hand Codex only the goal, relevant paths, constraints, out-of-scope items, acceptance criteria and verification. Never reasoning history.
- When Claude hands work to Codex, Codex does not commit; Claude verifies, reviews if risky, and commits.

# Effort

- Claude: efficient general model at medium effort for routine work. Strongest model at high effort for hard architecture, ambiguous requirements, important planning, risky or security review, and cross-cutting debugging. Go beyond high only when the problem shows the need.
- Codex: its current default coding model at medium reasoning. Use high when one reasonable attempt failed, debugging is hard, several systems interact, or being wrong is costly. Never above high by default. `.codex/config.toml` sets medium, but Codex applies it only once it trusts the folder; otherwise pass `-c model_reasoning_effort=medium`.

# Context

- One task per session; clear context between unrelated tasks.
- Reference file paths instead of pasting files. Trim logs to the relevant errors.
- Do not plan obvious tasks, delegate trivial ones, or have two models solve the same easy problem.
- Use targeted checks, review diffs rather than the whole repo, and stop when acceptance criteria are met.

# Git and Working Tree

- Run `git status` before significant work. Never assume existing changes belong to your task.
- Never overwrite, revert, discard or commit unrelated changes. Isolate your task's changes.
- Verify, then commit one coherent logical change.
- Never run `git reset --hard` or anything equivalent over unrelated work.
- TASK.md may be overwritten per task, but first check that it holds no uncommitted manual edits. Commit it with the task it describes.

# Failure Handling

Verification fails → diagnose → one focused repair → verify again. Fails again → stop, then roll back this task's changes or escalate to stronger reasoning or planning. Roll back immediately if the approach is wrong, regressions are widespread, the architecture was misunderstood, risky logic was damaged, or more patching would add complexity.

# Dependencies

- Use existing capabilities first; prefer a small implementation when it is simpler.
- Add a dependency only when justified, compatible, maintained and established.
- No unrelated upgrades. Broad upgrades are their own task.

# Security

- Never expose, paste into prompts, or commit API keys, passwords, tokens, production credentials, private certificates, or confidential user or customer data.
- Never weaken security or validation to make a test pass.
- Do not edit generated or vendored files unless necessary.

# Risky Changes

Authentication, authorisation, payments, sensitive or user data, database schema or migrations, destructive operations, security-sensitive code, important business logic, concurrency or state consistency, infrastructure or deployment, major dependencies, production-facing external API behaviour.

# Uncertainty

If something material is unverified, report UNKNOWN (what is uncertain), CHECKED (what was inspected) and NEEDED (what would resolve it). Do not guess.

# Friction

Log real friction in FRICTION.md. Count 1: log it, take no action. Count 2: observe. Count 3+: investigate whether a change is justified and is the simplest fix.

# Definition of Done

- Requested behaviour works.
- Appropriate verification passes.
- No known regression was introduced.
- Scope was respected.
- Risky work received a Claude diff review.
