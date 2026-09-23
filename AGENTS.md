# Project

New project. No application code yet. When the stack is chosen, update Stack, Folder Map and Commands in the same commit that introduces it.

# Stack

None yet.

# Folder Map

- `AGENTS.md`: rules for every agent (this file). Claude Code loads it through `CLAUDE.md`.
- `TASK.md`: brief for the current significant task. Overwrite per task.
- `FRICTION.md`: log of repeated workflow friction.
- `.codex/config.toml`: project-local Codex settings.

# Commands

None exist yet: no dev, test, lint, typecheck or build command. Do not invent them. Add a command here only after it has run successfully in this repo.

# Coding Rules

- Make the smallest correct change. No unrelated refactors, cleanup or file edits.
- Preserve existing architecture unless the task requires changing it.
- Inspect existing patterns and utilities before adding new ones.
- Add a dependency only if the project lacks the capability and a small implementation is not simpler; check compatibility and maintenance first. Never upgrade unrelated dependencies; upgrades are their own task.
- Never weaken security, validation or tests to make checks pass.
- Never invent commands, paths, APIs, library behaviour or business rules. If something material is unverified, report UNKNOWN (what is uncertain), CHECKED (what you inspected), NEEDED (what would resolve it).

# Git / Safety

- Run `git status` before significant work. Never overwrite, reset or discard uncommitted work you did not make.
- Verify, then commit one logical change. Keep features, fixes, refactors, formatting and dependency changes in separate commits.
- Never print, paste into prompts, or commit secrets: keys, tokens, passwords, `.env` values, certificates, user data.
- Do not edit generated or vendored files unless necessary.

# Risky Changes

These need a plan in TASK.md and a Claude review of the diff before commit:
authentication, authorisation, payments, sensitive or user data, database schema or migrations, destructive operations, security-sensitive code, important business logic, infrastructure or deployment, major dependency changes, concurrency or state consistency, production-facing external APIs.

# Task Routing

One agent per task by default. Hand-offs carry TASK.md and file paths, never reasoning history.

- Trivial (typo, rename, formatting, isolated UI or test tweak): change → targeted check → commit. No plan.
- Normal and clear: Codex implements → relevant checks → commit.
- Complex or ambiguous: Claude plans and writes TASK.md → Codex implements → verify → commit.
- Risky: as complex, then Claude reviews TASK.md, `git diff`, changed files and tests → fix → re-verify → commit.

# Effort

- Codex: medium reasoning by default (`.codex/config.toml`, applied only once Codex trusts this folder; otherwise pass `-c model_reasoning_effort=medium`). Use high after one reasonable failure or for genuinely hard or risky work. Never default to max.
- Claude: efficient model for routine work. Strongest model only for hard architecture, ambiguous planning, risky or security review, and cross-cutting failures.

# Failure Handling

Check fails → diagnose → one focused repair → re-check. Still failing → stop patching. Roll back only your own changes to the last good commit, never unrelated work, if the approach is wrong, regressions spread or risky logic was damaged; otherwise escalate to Claude planning.

# Context

- One task per session; clear context between unrelated tasks.
- Reference file paths instead of pasting files. Trim logs to the relevant error and stack trace.
- Run targeted checks and review diffs, not the whole repo. Stop when Done When is met.

# Friction

Log real, repeated workflow annoyances in FRICTION.md. Consider a workflow change only at count 3+, and only if it is justified.

# Definition of Done

- Requested behaviour works.
- Relevant tests, lint, typecheck and build pass, or are recorded as not existing yet.
- No known regression, and scope was respected.
- Risky changes had a Claude diff review.
