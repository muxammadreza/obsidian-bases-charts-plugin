# Structure Guidance

- Treat `packages/obsidian/src` as the source of truth for plugin code: `main.ts` registers Bases views, `ChartView.ts` coordinates data + events, `charts/` holds Svelte renderers, `echarts/` encapsulates option builders, and `utils/utils.ts` centralizes value parsing + color constants.
- Keep shared data types and wrappers in `ChartData.ts`; extend those helpers instead of re-implementing grouping or Y-domain logic elsewhere.
- Organize UI into Svelte components under `charts/`, pairing layout shells like `PlotGrid.svelte` with per-chart renderers such as `ScatterPlot.svelte`; route chart-specific props through the `buildOption` pattern already established there.
- Place automation workflows in `automation/`: build banners live in `automation/build`, release orchestration stays in `automation/release.ts`, and runtime debugging assets sit under `automation/dev` (process orchestration, stream multiplexer, focus hooks).
- Put tests under `tests/`, mirroring source structure (`tests/charts`, `tests/echarts`, etc.) and reusing setup shims (`tests/happydom.ts`, `tests/svelteLoader.ts`, `tests/obsidianMock.ts`); add new specs alongside related source modules.
- Use `exampleVault/` and `exampleData/` strictly for sample data when manually validating chart outputs; avoid mixing executable code into those folders.
- Honor the `packages` path alias in imports to keep cross-module references consistent; do not introduce relative parent traversals that bypass the alias.
