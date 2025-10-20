# Implementation Plan

- [x] 1. Replace legacy chart dependencies
  - Remove `svelteplot` and `svelte-echarts` from `package.json`; add `@ticatec/uniface-echarts@latest`.
  - Update Bun lockfile by running `bun install` to pin `echarts@^6.0.0`.
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Migrate runtime helpers to echarts6
  - [x] 2.1 Create `packages/obsidian/src/echarts/runtime.ts`
    - Implement `ensureRuntime` and `createChartInstance` handling theme registration and error propagation.
    - _Requirements: 1.3, 3.1_
  - [x] 2.2 Update `EChartsPlot.svelte` to use `<UnifaceChart>` and runtime helpers
    - Replace direct `SvelteECharts` usage with the new wrapper; preserve fallback UI paths.
    - _Requirements: 1.3, 3.2_

- [x] 3. Implement centralized echarts6 data pipeline
  - [x] 3.1 Add `packages/obsidian/src/echarts/dataPipeline.ts`
    - Translate `DataWrapper` outputs into echarts6 datasets/series with validation guards.
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Refactor `options.ts` and `config.ts` to consume pipeline results
    - Remove naive JSON overrides; expose structured option builders.
    - _Requirements: 1.1, 3.2, 4.1_

- [x] 4. Integrate configuration stack UI
- [x] 4.1 Create `charts/config-stack/ConfigStackHost.svelte` and `ConfigPanel.svelte`
    - Build floating stack with auto-hide timing, toggle icon, and sectioned controls.
    - _Requirements: 2.1, 2.2, 2.3, 3.1_
- [x] 4.2 Add `stackController.ts` to manage visibility state and pointer tracking
    - Implement timer reset helpers and expose typed events for the host component.
    - _Requirements: 2.2, 3.3_
- [x] 4.3 Embed stack host within `PlotGridItem.svelte` and wire event callbacks
    - Sync applied patches with chart options via the data pipeline.
    - _Requirements: 2.1, 3.2, 4.3_

- [x] 5. Update `ChartView` workflows
  - Replace use of `ECHARTS_OVERRIDES` with pipeline-driven configuration state and remove legacy settings.
  - Ensure `processData` emits data compatible with the new pipeline and config stack updates.
  - _Requirements: 3.2, 4.2, 4.3_

- [ ] 6. Add regression protections
  - Add lint/test guard to fail on residual legacy imports and naive overrides.
  - Create echarts6 smoke tests covering dataset transforms and option mutations.
  - _Requirements: 1.4, 1.5, 3.3, 4.2_
