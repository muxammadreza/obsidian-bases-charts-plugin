# Requirements Document

## Introduction

This specification outlines the complete migration from SveltePlot to ECharts6 implementation for the Bases Charts plugin. The migration will provide comprehensive chart customization capabilities through a floating configuration panel within the chart view, leveraging the @ticatec/uniface-echarts wrapper for robust ECharts6 integration.

## Glossary

- **UnifaceChart**: Base class from @ticatec/uniface-echarts for creating chart implementations
- **ChartPanel**: Svelte component from @ticatec/uniface-echarts for rendering charts
- **@ticatec/uniface-echarts**: TypeScript wrapper providing automatic ECharts management and Svelte integration
- **Chart_Class**: Custom class extending UnifaceChart for specific chart types (scatter, line, bar)
- **Configuration_Panel**: Floating panel for advanced chart customization
- **Bases_System**: Obsidian's data visualization framework for structured data
- **Wrapper_Methods**: Built-in methods like invalidate(), resize(), showLoading() provided by the wrapper
- **Event_Handlers**: Wrapper's event system for handling chart interactions

## Requirements

### Requirement 1

**User Story:** As a developer, I want to use the @ticatec/uniface-echarts wrapper properly, so that I can leverage automatic chart management and avoid manual implementation.

#### Acceptance Criteria

1. THE System SHALL use UnifaceChart base class for all chart implementations
2. THE System SHALL use ChartPanel component for rendering charts in Svelte
3. THE System SHALL override createOption() method to define chart configurations
4. THE System SHALL use postInitialize() method for event handler setup
5. THE System SHALL eliminate all manual ECharts API calls and instance management

### Requirement 2

**User Story:** As a user, I want a floating configuration panel within the chart view, so that I can access advanced customization options without using dropdown menus.

#### Acceptance Criteria

1. THE System SHALL implement a floating configuration panel inside each chart view
2. THE System SHALL provide a toggle button to show/hide the configuration panel
3. THE System SHALL position the configuration panel within the chart view boundaries
4. THE System SHALL make the configuration panel draggable and resizable
5. THE System SHALL persist the panel's visibility state per chart instance

### Requirement 3

**User Story:** As a user, I want comprehensive ECharts6 customization options, so that I can fully customize my charts according to my needs.

#### Acceptance Criteria

1. THE System SHALL provide all ECharts6 configuration options through the customization panel
2. THE System SHALL organize customization options into logical categories (appearance, data, interaction, animation)
3. THE System SHALL support real-time preview of configuration changes
4. THE System SHALL include advanced features like custom themes, animations, and interactions
5. THE System SHALL provide data transformation and filtering capabilities

### Requirement 4

**User Story:** As a developer, I want to use the wrapper's automatic data handling, so that I can focus on data transformation rather than chart management.

#### Acceptance Criteria

1. THE System SHALL transform Obsidian data to ECharts format in createOption() method
2. THE System SHALL use wrapper's invalidate() method for data updates
3. THE System SHALL let the wrapper handle all chart state and lifecycle management
4. THE System SHALL implement data transformation functions that return ECharts-compatible options
5. THE System SHALL avoid manual state management and use wrapper's built-in reactivity

### Requirement 5

**User Story:** As a developer, I want to use Svelte stores for configuration management, so that I can leverage reactive state without manual implementation.

#### Acceptance Criteria

1. THE System SHALL use Svelte stores for configuration state management
2. THE System SHALL call chart.invalidate() when configuration changes
3. THE System SHALL let the wrapper handle chart updates automatically
4. THE System SHALL use derived stores for computed configuration values
5. THE System SHALL avoid manual state synchronization and use reactive patterns

### Requirement 6

**User Story:** As a user, I want advanced data selection and manipulation tools, so that I can interact with my chart data effectively.

#### Acceptance Criteria

1. THE System SHALL provide data point selection and highlighting capabilities
2. THE System SHALL implement data filtering and search functionality
3. THE System SHALL support data export in multiple formats
4. THE System SHALL enable data point annotation and labeling
5. THE System SHALL provide statistical analysis tools for selected data

### Requirement 7

**User Story:** As a user, I want minimal basic configuration in the bases dropdown and comprehensive options in the floating panel, so that the interface is clean and powerful.

#### Acceptance Criteria

1. THE System SHALL keep only essential configuration options in the bases dropdown
2. THE System SHALL move all advanced customizations to the floating configuration panel
3. THE System SHALL implement a clean separation between basic and advanced options
4. THE System SHALL ensure the floating panel provides complete chart control
5. THE System SHALL design seamless integration between basic and advanced configurations

### Requirement 8

**User Story:** As a developer, I want to use the wrapper's built-in capabilities, so that I can avoid reinventing chart management functionality.

#### Acceptance Criteria

1. THE System SHALL use wrapper's built-in event system instead of manual event handling
2. THE System SHALL use wrapper's automatic resize handling instead of custom observers
3. THE System SHALL use wrapper's loading states instead of manual loading indicators
4. THE System SHALL use wrapper's lifecycle methods instead of manual cleanup
5. THE System SHALL eliminate all manual chart instance management code

### Requirement 9

**User Story:** As a developer, I want complete freedom to refactor and redesign, so that I can create the best possible implementation without legacy constraints.

#### Acceptance Criteria

1. THE System SHALL allow complete removal and replacement of existing code
2. THE System SHALL enable full architectural redesign without compatibility concerns
3. THE System SHALL prioritize clean, modern implementation over legacy support
4. THE System SHALL use contemporary development patterns and practices
5. THE System SHALL focus on logical soundness and correctness over backward compatibility
