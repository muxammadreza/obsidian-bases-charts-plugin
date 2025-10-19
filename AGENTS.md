# AGENTS.md Contract

This file governs agent behavior for the repository. Obey it unless superseded by a nested AGENTS.md.

## Steering Documents

- Use `.codex/steering/product.md`, `.codex/steering/tech.md`, `.codex/steering/structure.md` as the authoritative sources for product, tech, and structure guidance.
- Use `.codex/steering/context7-guidance.md` for Context7 MCP usage rules when collecting current Svelte, Svelte-echarts, echarts, or Obsidian API, new beta api for bases references.
- Use `.codex/steering/runtime-debugging.md` to coordinate runtime debugging flows that rely on `automation/dev` helpers and `.vscode` tasks.
- Reference Steering sections directly in outputs; do not restate their contents here or in task responses.
- Treat Steering files as read-only unless following the sanctioned update process defined by project owners.

## Decision Precedence

1. Steering documents under `.codex/steering/*.md`.
2. This AGENTS.md contract.
3. Generic assumptions (avoid unless explicitly permitted).

## Agent Behavior Contract

- Use project-provided abstractions or helpers for CLI and automation when available; prefer `automation/` tooling before creating custom scripts.
- Respect feature flags, configuration gates, and behavioral contracts defined in Steering or referenced code modules.
- Route logging through shared utilities; record lifecycle, success, and error signals without adding noisy or redundant output.
- Handle failures via centralized patterns (e.g., shared error helpers) instead of bespoke try/catch blocks.
- Balance performance and UX by aligning long-running work with project guidance; surface progress where the host expects it.

## Paths & I/O

- Use repository utilities for resolving paths into `.codex/steering` and related directories; avoid hardcoded absolute paths.
- Limit writes to approved workspace locations; never overwrite Steering files directly.
- Leverage existing filesystem helpers when present for read/write operations, especially around example data or build outputs.

## CLI Integration

- Invoke build, test, and release flows via project scripts (`package.json`, `automation/`) rather than crafting raw commands.
- Confirm required toolchains (Bun, Vite, etc.) are available before execution; provide setup guidance if missing.
- Honor repository approval modes and model flags by referencing their definition sites instead of duplicating literal values.

## Submission Checklist (For Agents)

- Consulted `.codex/steering/*.md` and cited relevant sections without duplication.
- Resolved paths using sanctioned helpers; avoided absolute path literals.
- Respected documented feature flags, gating, and configuration requirements.
- Used project-recognized wrappers for CLI and automation tasks.
- Kept responses concise, reference-first, and free of steering or constant re-statements.

## Non-Goals / Anti-Patterns

- Do not bypass official wrappers/utilities when an endorsed option exists.
- Do not persist mutable state outside established singletons or shared services.
- Do not write outside approved directories or mutate Steering directly.
- Do not re-enable disabled or experimental features without an explicit request.

## Instructions to Apply

- Create or update the repository-root `AGENTS.md` to reflect this contract.
- Ensure nested directories inherit these rules unless they provide their own AGENTS.md.
