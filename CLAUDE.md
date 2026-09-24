@AGENTS.md

Delegate to Codex from the repo root: `codex.cmd exec -s workspace-write -c model_reasoning_effort=medium "Implement TASK.md following AGENTS.md. Do not commit. Report changed files and verification results."` Use `high` instead of `medium` only when AGENTS.md's escalation rules apply. After a handoff, Claude verifies, reviews the diff if risky, and commits.
