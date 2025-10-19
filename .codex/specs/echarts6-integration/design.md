# Design Document

## Overview

This design migrates the Bases Charts plugin from SveltePlot primitives to ECharts 6 rendered through `svelte-echarts`, while preserving data processing in `packages/obsidian/src/ChartView.ts` and `packages/obsidian/src/ChartData.ts` and sustaining chart-specific affordances (multi-chart modes, Y-axis sync, percentage toggles, label props, and note navigation). The migration expands configurability by exposing ECharts options per chart type and an advanced override surface, all without breaking existing settings or palette usage mandated in `.codex/steering/product.md` and `.codex/steering/tech.md`.

## Architecture

- **Runtime layers**: `ChartView` continues to orchestrate Bases data, emitting `processData()` payloads (`package/obsidian/src/ChartView.ts:81-197`). Those payloads flow into `ChartData` wrappers (`packages/obsidian/src/ChartData.ts`) that now additionally expose helper accessors for ECharts series construction.
- **Option building pipeline**: introduce `packages/obsidian/src/echarts/options.ts` containing pure builders (`buildScatterOptions`, `buildLineOptions`, `buildBarOptions`) that transform a `DataWrapper` and `ChartConfigState` into ECharts `EChartsOption` objects. Builders encapsulate chart defaults, axis sync, palette mapping, and tooltip wiring, satisfying Requirement 1 AC2 and Requirement 2 AC1–AC2.
- **Svelte composition**: replace SveltePlot usage in `ScatterPlot.svelte`, `LinePlot.svelte`, and `BarPlot.svelte` with a shared `EChartsPlot.svelte` wrapper that owns a `svelte-echarts` `<ECharts>` instance and wires chart-ready / resize hooks. `PlotGrid.svelte` retains layout responsibilities but renders each chart via the wrapper (
  preserving multi-chart grids per Requirement 2). `PlotGridItem.svelte` continues to handle click-through via `view.openFile` (Requirement 4 AC1), now using ECharts `highlight` data to populate hover state.
- **Configuration bridge**: add `packages/obsidian/src/echarts/config.ts` for mapping `ChartView` settings (existing `CHART_SETTINGS` keys and new override key) into builder inputs, including derived axis labels, label toggles, percentage formatting, and optional smoothing / animation flags. Advanced overrides merge here (Requirement 3 AC1–AC3).
- **Theme management**: create `packages/obsidian/src/echarts/theme.ts` exporting a lazily cached ECharts theme object sourced from `OBSIDIAN_COLOR_PALETTE` and `OBSIDIAN_DEFAULT_SINGLE_COLOR` (Requirement 4 AC2). Builders reference this theme via `useTheme()` to keep options lean.

```mermaid
graph TD
    QueryController -->|bases data| ChartView
    ChartView -->|ProcessedData[]| ChartData
    ChartData -->|DataWrapper API| OptionsBuilder
    OptionsBuilder -->|EChartsOption| EChartsPlot
    EChartsPlot -->|rendered chart| User
    EChartsPlot -->|click event| ChartView.openFile
```

## Components and Interfaces

- `ChartView` (`packages/obsidian/src/ChartView.ts`)
    - Extend `onload` to pass `echartsVersion:"6"` prop into Svelte components for telemetry.
    - Add `getAdvancedOverrides()` to fetch & validate new JSON override field (`CHART_SETTINGS.ECHARTS_OVERRIDES`).
- `PlotGrid.svelte`
    - Replace snippet contract with prop `renderChart: (chartProps) => EChartsRenderable` that returns option + height hint.
    - Maintain legend generation; add conditional badges when advanced overrides apply per chart.
- `PlotGridItem.svelte`
    - Embed `<EChartsPlot>` component that accepts `option`, `height`, `width`, and `onDataPointClick` callback.
    - Track hovered series via ECharts `dispatchAction({type:'highlight'})` results to satisfy Requirement 4 AC3.
- `EChartsPlot.svelte` (new)
    - Props: `{ option: EChartsOption; height: number; width: number; theme: string; onDataPointClick: (point) => void }`.
    - Internally imports `{ ECharts }` from `svelte-echarts`, binds `on:finished` for resize, `on:click` for note navigation.
    - Emits user-friendly errors when ECharts throws (Requirement 1 AC3).
- `ScatterPlot.svelte`, `LinePlot.svelte`, `BarPlot.svelte`
    - Convert to use `build*Options` builders, keep settings watchers (e.g., `SHOW_PERCENTAGES`, `SHOW_LABELS`) and call `view.events.on('data-updated', refreshOptions)` (Requirement 3 AC1).
    - Scatter adds optional label property as `series.label.formatter` (Requirement 1, Requirement 3).
    - Bar chart handles stacked percentage view by configuring `yAxis.axisLabel.formatter` and enabling `series.label.show`.
- `options.ts` / `config.ts`
    - Define `ChartConfigState` interface bundling: `xLabel`, `yLabel`, `multiChartMode`, `yDomain`, `axisSync`, `showPercentages`, `showLabels`, `userOverrides`.
    - Provide deep-merge helper with allow/deny list for overrides (Requirement 3 AC2–AC3).

## Data Models

- Extend `ProcessedData` usage with helper `toEChartsDataPoints(dataWrapper, chartIndex)` returning `{ value: [xValue, yValue], file, label, seriesKey }` arrays to align with ECharts Cartesian series formats.
- Introduce `type EChartsDatum = { value: (number|string|Date)[]; file: string; label?: string; groupIndex: number; }` for builder clarity.
- Define `type ChartOptionResult = { option: EChartsOption; derivedLegend: LegendEntry[] }` to pass legend metadata back to `PlotGrid`.
- Persist configuration in existing Obsidian view config store; add new key `ECHARTS_OVERRIDES = 'echarts-options-override'` storing JSON string validated via `JSON.parse` with schema ensuring only display-level properties mutate (Requirement 3 AC2–AC3).

## Error Handling

- Wrap override parsing in try/catch; on failure call existing notification channel via `this.app.notify` or equivalent used elsewhere (mirrors `ChartView` warning pattern) and drop invalid overrides (Requirement 3 AC3).
- In `EChartsPlot.svelte`, listen for `on:error` from `svelte-echarts`; dispatch plugin notification and render fallback text "Chart failed to render" (Requirement 1 AC3).
- Guard data-empty states in `PlotGrid` by reusing current messages; skip ECharts instantiation when `data.getFlat()` returns empty (Requirement 2 AC3).
- Use TypeScript narrowings in `options.ts` to ensure `yDomain` min/max fallbacks before feeding ECharts; log once when domain invalid.

## Testing Strategy

- **Option builders**: add Bun unit tests under `tests/echarts/options.test.ts` verifying builder outputs for single chart, grouped, property-separated, and override merge scenarios, referencing Requirements 1–3.
- **Override validation**: tests ensuring unsafe overrides (e.g., `series[0].data`) are rejected with explanatory messages (Requirement 3 AC3).
- **Interaction hooks**: component tests with `@testing-library/svelte` (already available via `tests/` harness) to simulate click events on `EChartsPlot` and assert `ChartView.openFile` is invoked, covering Requirement 4 AC1.
- **Regression smoke**: add integration test to confirm zero-data states short-circuit ECharts instantiation (Requirement 2 AC3).
- Run via existing `bun run check` pipeline per `.codex/steering/tech.md` to keep lint/svelte-check coverage.
