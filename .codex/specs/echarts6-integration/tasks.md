# Implementation Plan

- [x]   1. Scaffold ECharts integration layer
- [x] 1.1 Create `packages/obsidian/src/echarts/options.ts` with `buildScatterOptions`, `buildLineOptions`, `buildBarOptions` returning `EChartsOption` using existing `DataWrapper` accessors. _Requirements: 1.1, 1.2, 2.1, 2.2_
- [x] 1.2 Add helper types (`EChartsDatum`, `ChartOptionResult`) and transformation functions consuming `ProcessedData` from `ChartData`. _Requirements: 1.2, 2.1_
- [x] 1.3 Implement override merge utility enforcing allow-list (block `series[].data` etc.) and surface conflict errors. _Requirements: 3.2, 3.3_

- [x]   2. Wire ChartView configuration bridge
- [x] 2.1 Extend `ChartView` to expose `getAdvancedOverrides()` parsing new `CHART_SETTINGS.ECHARTS_OVERRIDES`; add constant definition. _Requirements: 1.2, 3.1, 3.2, 3.3_
- [x] 2.2 Update `ChartData` wrappers with helpers (`toEChartsDataPoints`, legend metadata) consumed by option builders. _Requirements: 1.2, 2.1, 4.2_
- [x] 2.3 Introduce `packages/obsidian/src/echarts/config.ts` producing `ChartConfigState` using existing settings (percentage toggle, labels, multi-chart mode, y-domain sync). _Requirements: 1.2, 2.1, 3.1_

- [x]   3. Replace SveltePlot components with ECharts
- [x] 3.1 Add `packages/obsidian/src/charts/EChartsPlot.svelte` wrapping `svelte-echarts` and exposing click/hover callbacks. _Requirements: 1.1, 4.1, 4.3_
- [x] 3.2 Refactor `ScatterPlot.svelte`, `LinePlot.svelte`, `BarPlot.svelte` to call option builders, watch view events, and feed options to `EChartsPlot`. _Requirements: 1.1, 1.2, 3.1, 4.3_
- [x] 3.3 Adjust `PlotGrid.svelte` and `PlotGridItem.svelte` to work with `EChartsPlot`, maintain legends, and respect minimum sizing. _Requirements: 2.1, 2.2, 2.3, 4.1_

- [x]   4. Theme and error handling
- [x] 4.1 Create `packages/obsidian/src/echarts/theme.ts` exporting palette-derived theme registration used by `EChartsPlot`. _Requirements: 4.2_
- [x] 4.2 Ensure initialization failures raise existing plugin notifications and render fallback messaging. _Requirements: 1.3_

- [x]   5. Tests and verification
- [x] 5.1 Add Bun tests under `tests/echarts/options.test.ts` covering option builders plus override guards. _Requirements: 1.2, 2.1, 3.2, 3.3_
- [x] 5.2 Add component tests (e.g., `tests/charts/echarts-plot.test.ts`) asserting point click yields `ChartView.openFile`. _Requirements: 4.1_
- [x] 5.3 Extend zero-data regression test ensuring property segmentations without numeric values bypass ECharts instantiation. _Requirements: 2.3_
