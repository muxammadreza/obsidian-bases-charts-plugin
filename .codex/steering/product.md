# Product Guidance

- Describe the plugin as an Obsidian Bases extension that registers scatter, line, and bar chart views via `packages/obsidian/src/main.ts` so users can visualize Base data without leaving Obsidian.
- Emphasize multi-chart support driven by `ChartView.processData` (see `packages/obsidian/src/ChartView.ts`) where grouping either splits charts by selected Y properties or Base groupings.
- Note that X-axis values must resolve through `parseValueAsX` and Y-axis series must parse as numbers (`packages/obsidian/src/utils/utils.ts`); highlight that non-numeric Y data is ignored rather than coerced.
- Call out the value proposition: interactive charts inherit Obsidian themes, use color palettes from `OBSIDIAN_COLOR_PALETTE`, and respect Base-configured grouping so analysts gain visual summaries with minimal setup.
- Remind contributors to preserve advanced overrides (labels, percentages, Y-domain sync) surfaced in `ChartView.getAdvancedOverrides` and `buildChartConfig` so users can tune visual output without code changes.
- When documenting features, reference the user workflow from README.md (Base creation → choose view → configure axes) and align new UX with that funnel.
