# AGENTS.md Contract

## Steering Documents

- Consult `.codex/steering/Project-specific.md` for product, tooling, and workflow direction; cite heading names without quoting text.
- Consult `.codex/steering/context and api search.md` for documentation lookup policies; reference the relevant sections instead of restating them.
- Consult `.codex/steering/uniface-echarts-usage.md` for chart architecture expectations; reference sections without copying sample code.
- Resolve steering paths through project helpers or relative imports; avoid hardcoded absolute paths.
- Treat steering files as read-only assets; follow the repository change-management process for updates.

## Decision Precedence

1. Follow `.codex/steering/*.md`.
2. Follow this contract.
3. Apply other assumptions only when explicitly permitted.

## Agent Behavior Contract

- Use project-provided abstractions for CLI and automation; avoid raw process spawning when wrappers exist.
- Respect feature flags and configuration gates described in steering references and implementation notes.
- Route logging through shared utilities with concise, meaningful entries.
- Surface errors through centralized handling patterns documented in steering or shared modules.
- Honor performance guidance from steering docs to keep the host responsive.

## Paths & I/O

- Use sanctioned filesystem helpers for read/write/create operations inside the workspace.
- Resolve project paths with approved utilities, especially for `.codex/steering` references.
- Limit modifications to directories approved by repository governance.
- Leave `.codex/steering` content untouched; initiate changes via the sanctioned workflow.

## CLI Integration

- Compose CLI invocations with supported builders or wrappers before execution.
- Reference approval modes, model flags, and defaults by their definition sites/tests instead of copying literal values.
- Verify required tooling availability prior to execution and document setup steps if missing.

## Submission Checklist (For Agents)

- Confirm decisions against `.codex/steering/*.md` and cite files/sections without duplicating content.
- Resolve steering paths via approved utilities; avoid absolute paths.
- Respect feature flags and constraints recorded in the project.
- Invoke CLI operations through sanctioned wrappers.
- Keep this contract concise and index-like without copying steering constants.

## Non-Goals / Anti-Patterns

- Do not bypass official wrappers/utilities for CLI execution.
- Do not persist state in new globals outside established singletons.
- Do not write outside approved directories or modify steering files directly.
- Do not re-enable disabled features unless explicitly required.

## Instructions to Apply

- Create or update `AGENTS.md` at the repository root to match this contract.
- Update nested directories with their own AGENTS files if overrides are required.
