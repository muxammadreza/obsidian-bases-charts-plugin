# Runtime Debugging

This guide shows how to attach VS Code to Obsidian while developing the Bases Charts plugin.

## Prerequisites

- Install project dependencies with `bun install`.
- Ensure `.env` contains `DEV_VAULT_PATH` pointing at the dev vault Obsidian should load.
- Close any running Obsidian instance before starting a debugging session.

## Start the development build

You can let VS Code handle the background build by running the `bun: dev` task (Terminal → Run Task → `bun: dev`). The task invokes `bun run dev`, which watches the sources under `packages/obsidian/src` and mirrors the build into the vault path configured in `.env` (see steering guidance in `.codex/steering/tech.md`).

## Launch Obsidian in remote-debug mode

Use the new automation helper to relaunch Obsidian with Chrome DevTools remote debugging enabled. It automatically opens `bases-preview.base` from your dev vault (via an `obsidian://open` deep link) so chart errors surface in the console right away. The command now stays active and streams the renderer console into the integrated terminal, giving Copilot (and humans) a live view of runtime errors:

```sh
bun run obsidian:debug
```

The script (see `automation/dev/launchObsidianDebug.ts`) locates the Obsidian binary for macOS, Windows, or Linux. Override defaults with environment variables when needed:

- `OBSIDIAN_EXECUTABLE`: absolute path to the Obsidian binary.
- `OBSIDIAN_REMOTE_DEBUG_PORT`: change the remote debugging port (defaults to `9222`).
- `OBSIDIAN_PROFILE`: pick a specific Obsidian profile.

After Obsidian starts, open the vault at `DEV_VAULT_PATH` so it loads the hot-rebuilt plugin files.

While the helper is running you will see log lines prefixed with `obsidian-console/…` and `obsidian-error`. These are DevTools Runtime events captured from the renderer process. Stop the stream with `Ctrl+C` (or the VS Code task termination command) once you are done debugging.

## Attach VS Code

Open the Run and Debug panel and launch the **Run Dev + Attach** compound configuration. VS Code will:

1. Start the `bun: dev` task (if not already running).
2. Launch `obsidian: debug` in the background and wait until the console bridge prints `obsidian-debug] debugger-ready`.
3. Attach a Chrome debugger to `http://localhost:9222`, giving you breakpoints and call stacks mapped back to TypeScript sources. The debugger uses the modern `pwa-chrome` adapter and filters directly to the Obsidian renderer.

You can also run the standalone **Attach to Obsidian Renderer** configuration once Obsidian is already running in debug mode.

## Troubleshooting

- If VS Code cannot attach, make sure no other process is using the chosen remote debugging port and that Obsidian launched via `bun run obsidian:debug`.
- For script path resolution issues, set `OBSIDIAN_EXECUTABLE` explicitly in your shell or `.env`.
- When sourcemaps do not load, confirm the dev build is active (`bun: dev` task output) and that Vite is still writing to the dev vault.
