# Runtime Debugging Steering Guide

## Primary Workflow

- Run `bun run debug:runtime` (wired through `automation/dev/runtimeDebug.ts`) and wait for `RuntimeDebugOrchestrator` to log `[runtime-debug] Runtime debugging workflow initialized; live streams active.` before acting on output.
- Keep `bases-preview.base` present in the active vault. `focusBasesPreview()` issues `obsidian://open?file=bases-preview.base`; failed launches surface as `[obsidian-console] Failed to focus bases-preview.base` warnings.
- Expect the startup sequence `build-status: starting` → `runtime-status: attaching` → `runtime-status: attached`. If you pass `--no-relaunch`, `ObsidianConsoleProcess` skips running `open -a Obsidian --devtools --remote-debugging-port=39200` and only attaches.
- Interrupt the orchestrator with `SIGINT` or `SIGTERM`; `RuntimeDebugOrchestrator.stop()` tears down participants in reverse order so the Bun watcher exits before the DevTools bridge.

## Build Stream Signals

- `DevWatcherProcess` in `automation/dev/processes/DevWatcherProcess.ts` parses Bun output. A compilation failure produces paired events: a `build-log` on `stderr` and a `build-error` forwarded to the tracker. Look for `[dev-watcher]` prefixed logs and `[tracker] new error build:…` notifications.
- A clean rebuild triggers `type: 'build-status', status: 'clean'`, which renders as `[build-clean] Build cycle completed without errors.` in `logStreamEvent`. Wait for this after applying fixes before re-checking runtime errors.
- If the watcher exits (`status: 'exited'`), inspect the exit code printed in `[build-status] exited (exit=<code>)`—non-zero codes usually indicate Bun command failures or missing dependencies under the current `cwd`.

## Runtime Stream Signals

- `ObsidianConsoleProcess` (`automation/dev/processes/ObsidianConsoleProcess.ts`) emits `runtime-status` changes: `attaching`, `attached`, `detached`, or `error`. A reconnect loop prints `detail: waiting-for-obsidian`; reopen Obsidian or restart the workflow if it stalls there.
- Console output is normalized through CDP: `console.error` and thrown exceptions raise `runtime-error` events with stack traces combined from `exceptionThrown`. Info and warn logs arrive as `runtime-log` events; both include `metadata.origin` set to `console` or `log` so you can distinguish `Runtime` vs `Log` domains.
- When the CDP channel drops, `scheduleReconnect()` attempts to reattach and logs `[runtime-status] attaching (waiting-for-obsidian)`. Persistent failures emit `[runtime-status] error (reconnect-failed:…)`; resolve the underlying port conflict and rerun the workflow.

## Tracking Errors

- `RuntimeErrorTracker` (`automation/dev/RuntimeErrorTracker.ts`) stores active issues in `.codex/tmp/runtime-debug-state.json`. Each error signature combines `source`, `origin`, and the full message, so repeated stack traces roll into the same entry.
- Use the interactive prompt (`bun run debug:runtime --interactive`) or the WebSocket command bridge to run `resolve <error-id> [note]`. This calls `markResolved` and immediately rebroadcasts the snapshot via `StreamMultiplexer.broadcastTracker`.
- `RuntimeErrorTracker` records every error message under `history`. When evaluating regressions, inspect `history` timestamps to confirm whether a fix actually stops new events or just clears the active flag momentarily.

## WebSocket Interface

- `StreamMultiplexer.startWebSocketServer()` serves the feed at `ws://127.0.0.1:48321` by default. Override with `RUNTIME_DEBUG_STREAM_HOST` or `RUNTIME_DEBUG_STREAM_PORT` before launching.
- On connect, clients receive `{ type: 'snapshot', events, tracker }`. Ongoing traffic batches into `{ type: 'event-batch', events: [...] }` within ~100 ms windows.
- Send `{ "type": "resolve", "id": "<error-id>", "note": "…" }` or `{ "type": "list" }` to the command channel; responses arrive as `{ type: 'command-response', payload }`. Errors return `{ type: 'command-error', error }`.

## Dry Run Mode

- `bun run debug:runtime:dry-run` swaps in `createDryRunParticipants` from `automation/dev/dryRunParticipants.ts`. Expect alternating `Dry-run build watcher active…` and `Dry-run simulated runtime error.` messages so you can verify dashboards without touching Obsidian.
- The dry run still persists tracker state; clear `.codex/tmp/runtime-debug-state.json` if you want a clean slate before real sessions.

## Recovery Patterns

- If both participants stop (`build-status: stopped` and `runtime-status: detached`), restart the workflow; the orchestrator only auto-reconnects the runtime side.
- When state corruption is suspected, remove `.codex/tmp/runtime-debug-state.json`; `RuntimeErrorTracker.load()` will recreate it and log `Failed to read state file` once before continuing.
- Use `resolve` commands rather than deleting the state file mid-session—`markResolved` keeps a resolved history that feeds downstream analytics in the steering tooling.
