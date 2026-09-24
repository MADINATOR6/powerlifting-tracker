# Task

<!-- Temporary state for complex or risky tasks. May be overwritten per task after checking it holds no uncommitted manual edits. Reference paths; do not paste files. -->

## Goal
<!-- What must be accomplished. -->
Add a Node script `hello.js` at the repo root that prints exactly `Hello from Codex` to stdout, plus a test `hello.test.js` that proves it.

## Relevant Files
<!-- Only likely relevant files/directories. -->
- `hello.js` (new)
- `hello.test.js` (new)

## Constraints
<!-- Important requirements and things that must not change. -->
- Exactly one implementation file and one test file.
- Test uses Node's built-in runner only (`node:test`, `node:assert`, `node:child_process`). No installs, no `package.json`, no `node_modules`.
- The test runs `hello.js` as a child process with `process.execPath` and asserts the trimmed stdout equals `Hello from Codex` and the exit code is 0.
- Keep CommonJS defaults (no `package.json` exists).
- Do not modify any other file. Do not commit.
- Rollback: delete `hello.js` and `hello.test.js`; `git status` must then show no changes other than this TASK.md.

## Out of Scope
<!-- Adjacent work that must NOT be done. -->
- `package.json`, npm scripts, dependencies, linters or CI config.
- CLI arguments, config, or any output besides the one line.
- Edits to AGENTS.md, CLAUDE.md, BOOTSTRAP.md, FRICTION.md or `.codex/`.

## Done When
<!-- Concrete acceptance criteria. -->
- `node hello.js` prints `Hello from Codex` and exits 0.
- `node --test hello.test.js` passes with 1+ passing test and 0 failures.
- `git status --short` shows only `hello.js`, `hello.test.js` (and TASK.md).

## Verify
<!-- Commands/checks proving the task works. -->
- `node hello.js`
- `node --test hello.test.js`
- `git status --short`

Unknowns: none blocking. Checked: working tree clean on `main`, no `package.json`, Node v24.21.0 (has `node:test`).
