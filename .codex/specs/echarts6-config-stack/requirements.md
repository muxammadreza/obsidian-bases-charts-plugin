# Requirements Document

## Introduction
This feature finalizes the migration of Bases chart views from the legacy SveltePlot setup to an echarts6-driven implementation. It replaces the naive JSON override flow with a comprehensive in-view configuration stack that leverages the svelte-echarts wrapper, ensures dependency alignment with echarts6, and delivers robust data handling aligned with Obsidian Bases expectations.

## Requirements

### Requirement 1

**User Story:** As a Bases analyst, I want chart views to rely on echarts6, so that I can access the latest visualization features with consistent behaviour.

#### Acceptance Criteria
1. WHEN the plugin is built THEN the dependency graph SHALL pin echarts6, remove SveltePlot packages, and eliminate legacy migration shims.
2. IF the bundled svelte-echarts package requires echarts5 THEN the system SHALL either override its peer dependency or replace it with a maintained wrapper so that echarts6 bindings load without runtime or build-time regressions.
3. WHEN any chart renderer initializes THEN the view layer SHALL instantiate echarts6 instances exclusively through the supported svelte-echarts wrapper.
4. WHEN lint or test suites inspect the codebase THEN the system SHALL fail on residual imports, files, or configs tied to the prior SveltePlot implementation.
5. WHEN echarts6 integration is verified THEN the system SHALL include automated smoke tests demonstrating the wrapper operates with echarts6 APIs that differed from echarts5 (e.g., dataset upgrades, sampling options).

### Requirement 2

**User Story:** As a Bases analyst, I want a floating configuration stack within the chart view, so that I can tune chart settings without leaving the visualization context.

#### Acceptance Criteria
1. WHEN a chart view renders THEN the configuration stack SHALL mount inside the chart viewport and exclude Bases top-bar dropdowns.
2. WHEN the pointer remains outside the configuration stack for three consecutive seconds THEN the stack SHALL auto-hide while preserving active chart state.
3. WHEN the analyst activates the in-view configuration icon THEN the stack SHALL toggle visibility without reloading the chart data.

### Requirement 3

**User Story:** As a Bases analyst, I want comprehensive echarts6 customization options, so that I can adjust chart behaviour, styling, and interactivity for varied datasets.

#### Acceptance Criteria
1. WHEN the configuration stack is expanded THEN it SHALL present grouped controls that map to echarts6 capabilities for axes, series, legends, tooltips, datasets, interactions, and theming.
2. WHEN an analyst adjusts a configuration control THEN the system SHALL update the echarts6 option payload via supported APIs without falling back to naive JSON overrides.
3. WHEN invalid or unsupported option combinations are entered THEN the configuration stack SHALL surface validation feedback and maintain the last valid chart configuration.

### Requirement 4

**User Story:** As a Bases analyst, I want a unified echarts6 data pipeline, so that every chart view consumes consistent, reliable datasets without legacy SveltePlot artifacts.

#### Acceptance Criteria
1. WHEN chart data is prepared for rendering THEN the system SHALL route all transformations through a centralized echarts6 data service that supersedes legacy SveltePlot utilities.
2. WHEN Base records are refreshed, filtered, or regrouped THEN the centralized service SHALL emit normalized datasets compatible with echarts6 dataset APIs while maintaining grouping semantics defined in ChartData helpers.
3. IF any module attempts to invoke deprecated SveltePlot data paths or naive JSON overrides THEN the build or runtime SHALL block the call and surface a migration error referencing the echarts6 pipeline.
