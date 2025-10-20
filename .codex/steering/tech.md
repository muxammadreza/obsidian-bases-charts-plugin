# Tech Guidance
- Use Bun as the runtime for scripts (`package.json` scripts call `bun run`); install deps with `bun install` to match the lockfile.
- Build the plugin through Vite per `vite.config.ts`; prefer `bun run build` for production and `bun run dev` for watch mode so the bundle lands in the configured Obsidian plugin directory during development.
- Leverage the Svelte 5 toolchain configured in `svelte.config.js`; write components using `$state`/`$derived` patterns already present in `packages/obsidian/src/charts/*.svelte`.
- Import modules through the `packages` alias declared in `vite.config.ts` instead of relative paths when reaching across packages.
- Run quality gates with the bundled scripts: `bun run check` for the full formatting/type/lint/test suite, `bun run test` (Bun test + happy-dom) for unit specs in `tests/`, and `bun run svelte-check` before merging Svelte work.
- For runtime validation, rely on `bun run debug:runtime` (see `automation/dev/runtimeDebug.ts`) to launch the orchestrated watcher + Obsidian console stack; use `--no-relaunch` and `--dry-run` flags as implemented there instead of creating custom dev scripts.
- Keep external chart behaviour wired through `echarts` and `svelte-echarts`; ensure new code respects the existing override parsing handled in `packages/obsidian/src/echarts/options.ts` and `packages/obsidian/src/echarts/config.ts`.
