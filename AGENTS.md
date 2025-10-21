# AGENTS.md Contract

## Steering Documents
- Treat `.codex/steering/product.md`, `.codex/steering/tech.md`, and `.codex/steering/structure.md` as the authoritative sources for product, technical, and structural decisions.
- Resolve steering paths with repository-approved helpers; avoid hardcoded absolute paths.
- Keep steering files read-only and follow the sanctioned change-management flow for updates.
- Summarize applicable steering guidance in outputs and cite the specific file/section instead of restating content.

## Decision Precedence
1) Steering documents under `.codex/steering/*.md`.
2) This AGENTS.md contract (general repository conventions).
3) Generic assumptions (avoid unless explicitly allowed).

## Agent Behavior Contract
- Prefer project-provided abstractions for CLI operations before spawning ad-hoc processes.
- Respect feature flags and configuration gating documented in Steering or referenced code.
- Use the shared logging utilities to capture lifecycle and error paths without excessive noise.
- Route failures through centralized services/utilities rather than standalone try/catch blocks.
- Honor performance and UX guidance from Steering to keep the host environment responsive.

## Paths & I/O
- Use sanctioned filesystem helpers for workspace reads, writes, and file creation.
- Resolve paths for `.codex/steering` and related directories via approved utilities; avoid absolute paths.
- Modify files only within approved workspace areas and keep `.codex/steering` untouched directly.

## CLI Integration
- Build CLI commands through officially supported builders or wrappers before execution.
- Reference definition sites or tests for approval modes and model flags instead of duplicating values.
- Verify required tooling availability before invocation and surface setup guidance when missing.

## Submission Checklist (For Agents)
- Verify decisions against steering (`.codex/steering/*.md`) and cite files/sections without duplication.
- Resolve steering paths via approved utilities and avoid absolute paths.
- Respect documented feature flags and constraints.
- Use project-sanctioned CLI wrappers where available.
- Keep this contract concise and reference-first without restating constants.

## Non-Goals / Anti-Patterns
- Do not bypass official CLI wrappers or utilities when they exist.
- Do not store state outside established singletons.
- Do not write outside approved directories or overwrite steering content directly.
- Do not re-enable disabled features without explicit instructions.

## Instructions to Apply
- Write or update `AGENTS.md` at the repository root following this contract structure.
- Update existing AGENTS.md files in place to maintain reference-first guidance without duplicating steering content.
