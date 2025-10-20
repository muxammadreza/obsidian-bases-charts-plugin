# Runtime Debugging Steering Guide

## Overview

The `bun run debug:runtime` workflow launches a dual-stream debugging environment. One stream runs `bun run dev` to capture compilation output, and the other attaches to the Obsidian developer console focused on `bases-preview.base`. The AI agent watches both feeds to diagnose build and runtime issues in real time.

## Quick Start

1. Run `bun run debug:runtime`.
2. Monitor the build feed:
   - `info` messages mean the watcher is compiling.
   - `warn`/`error` messages highlight compile failures.
3. Monitor the runtime feed:
   - `runtime-console` surfaces `console.*` calls.
   - `runtime-log` captures log entries and stack traces.
4. When an error appears:
   - Inspect the `RuntimeErrorTracker` entry.
   - Apply code fixes.
   - Wait for a clean build (`build-clean`).
   - Verify that runtime errors resolve.
5. Use `markResolved` via the agent REPL or API once the error is fixed.

## Commands & Flags

- `bun run debug:runtime` — launches the orchestrator with streams and tracker.
- `bun run debug:runtime:dry-run` — emits synthetic build/runtime events without starting Bun or Obsidian.
- Append `--no-relaunch` to attach only to an already-running Obsidian instance (the workflow will not restart Obsidian if you close it). If Obsidian closes while the workflow is running, the watcher stays in a reconnecting state and resumes once you reopen the app.
- `RUNTIME_DEBUG_STREAM_PORT` — override the WebSocket port (default `48321`).
- `RUNTIME_DEBUG_STREAM_HOST` — override the WebSocket host (default `127.0.0.1`).
- `OBSIDIAN_RUNTIME_VAULT` — set the vault name for the Obsidian URI focus command.

## WebSocket Protocol

- `snapshot` message contains buffered events and tracker state.
- `event-batch` message streams grouped events for coalesced updates.
- `tracker` message shares updated error tracker snapshots.
- `command-response` message returns results for agent-issued commands (`resolve`, `list`).

## Error Resolution Workflow

1. Identify new errors via tracker notifications (`[tracker] new error`).
2. Inspect the associated source (`build` vs `runtime`) and origin.
3. Apply code changes and re-run builds automatically via watcher.
4. Confirm runtime resolution.
5. Use the REPL command `resolve <error-id> [note]` to mark resolved.
6. Tracker broadcasts updates to all subscribers; errors move to resolved list.

## Safety & Recovery

- The orchestrator auto-reconnects to Obsidian if the DevTools tunnel drops.
- Restart the workflow if both streams exit unexpectedly.
- State snapshots live in `.codex/tmp/runtime-debug-state.json`; delete or archive between sessions if you want a fresh run.

## Contact Points

- Multiplexer WebSocket: `ws://<host>:<port>` (defaults to `127.0.0.1:48321`).
- REPL port is exposed only in interactive mode (TBD).
