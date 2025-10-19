# Requirements Document

## Introduction

The Bases Charts Obsidian plugin must migrate its scatter, line, and bar chart experiences to ECharts 6 via the svelte-echarts binding while preserving existing data pipelines, multi-chart modes, and Obsidian-themed styling. The migration should expand chart configurability so users can leverage ECharts option richness without losing current plugin affordances such as point-to-note navigation.

## Requirements

### Requirement 1

**User Story:** As a vault user viewing Bases query results, I want charts rendered with ECharts 6 through svelte-echarts, so that I gain modern visualization capabilities without losing current chart views.

#### Acceptance Criteria

1. WHEN the plugin creates a scatter, line, or bar chart view THEN the system SHALL render the plot through a svelte-echarts component targeting ECharts 6.
2. WHEN the plugin builds chart data via `ChartView.processData` THEN the system SHALL adapt the payload to ECharts 6 option structures without altering upstream data contracts.
3. IF a chart view fails to initialize with ECharts 6 THEN the system SHALL surface a user-visible error using existing plugin notification patterns.

### Requirement 2

**User Story:** As an analyst segmenting Bases data, I want multi-chart grouping and property modes to work with the new engine, so that my existing dashboards remain valid after the migration.

#### Acceptance Criteria

1. WHEN `MultiChartMode.GROUP` is selected THEN the system SHALL render grouped sub-charts in ECharts 6 with synchronized axis handling equivalent to the current implementation.
2. WHEN `MultiChartMode.PROPERTY` is selected for a numeric dimension THEN the system SHALL emit one ECharts 6 instance per property value while sharing axis ranges where configured.
3. IF a selected segmentation yields no numeric Y-values THEN the system SHALL display the current "no plottable data" messaging without instantiating ECharts.

### Requirement 3

**User Story:** As a power user customizing visuals, I want access to key ECharts display options, so that I can tailor chart appearance and behavior to my needs.

#### Acceptance Criteria

1. WHEN a user modifies chart-specific settings (such as axis labels, percentage toggles, or label visibility) THEN the system SHALL translate those settings into the corresponding ECharts 6 option properties before rendering.
2. WHEN the user opts into advanced styling overrides in chart settings THEN the system SHALL merge user-defined option fragments with the plugin defaults while preventing breaking overrides of critical data bindings.
3. IF a user-provided override conflicts with required data bindings (e.g., series data arrays) THEN the system SHALL reject the override and inform the user using existing validation messaging.

### Requirement 4

**User Story:** As a note author exploring chart insights, I want interactivity like data point click-through and theme alignment to persist, so that charts feel native to Obsidian.

#### Acceptance Criteria

1. WHEN a user clicks a rendered data point THEN the system SHALL continue to call `ChartView.openFile` with the associated note reference.
2. WHEN the Obsidian theme or plugin palette is applied THEN the system SHALL propagate current color tokens into the ECharts 6 theme configuration for all chart types.
3. IF an interaction (hover tooltip, click, legend toggle) is unsupported by the default ECharts configuration THEN the system SHALL explicitly re-enable it to match existing behavior.
