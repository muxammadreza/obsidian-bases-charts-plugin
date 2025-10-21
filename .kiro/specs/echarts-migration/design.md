# Design Document

## Overview

This design outlines a wrapper-based architecture for the Bases Charts plugin, leveraging @ticatec/uniface-echarts for automatic chart management. The implementation eliminates manual ECharts handling and focuses on creating chart classes that extend UnifaceChart and using ChartPanel components for rendering.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    A[Obsidian Plugin Entry] --> B[Chart View Factory]
    B --> C[Obsidian Chart View]
    C --> D[Chart Classes]
    C --> E[Configuration Panel]

    D --> F[ScatterChart extends UnifaceChart]
    D --> G[LineChart extends UnifaceChart]
    D --> H[BarChart extends UnifaceChart]

    F --> I[ChartPanel Component]
    G --> I
    H --> I

    I --> J[@ticatec/uniface-echarts]
    J --> K[Apache ECharts 6]

    E --> L[Svelte Stores]
    L --> M[Configuration State]
```

### Wrapper-Based Architecture

The system leverages the @ticatec/uniface-echarts wrapper for:

1. **Automatic Chart Management**: No manual instance creation/destruction
2. **Built-in Lifecycle Handling**: Automatic resize, cleanup, and state management
3. **Event System**: Wrapper-provided event handling infrastructure
4. **Svelte Integration**: Native ChartPanel component for rendering
5. **Reactive Updates**: Automatic chart updates via invalidate() method

## Components and Interfaces

### Core Components

#### 1. Chart Classes (Extend UnifaceChart)

```typescript
export class ScatterChart extends UnifaceChart {
	constructor(private basesView: EChartsChartView) {
		super();
	}

	protected createOption(): any {
		// Transform Obsidian data to ECharts options
		const data = this.basesView.getProcessedData();
		return {
			// ECharts configuration object
			series: [
				{
					type: 'scatter',
					data: data.entries.map(entry => [entry.x, entry.y]),
				},
			],
		};
	}

	protected postInitialize(chart: any): void {
		// Set up event handlers using wrapper's event system
		this.setEventHandlers({
			onClick: params => {
				if (params.data?.file) {
					this.basesView.openFile(params.data.file, false);
				}
			},
		});
	}
}
```

#### 2. Obsidian Chart View (Integrates with Bases)

```typescript
export class EChartsChartView extends BasesView {
	private chart: UnifaceChart;
	private configStore: Writable<ChartConfig>;

	onload(): void {
		// Create chart instance
		this.chart = new ScatterChart(this);

		// Mount Svelte component with ChartPanel
		mount(ChartViewComponent, {
			target: this.scrollEl,
			props: { chart: this.chart, configStore: this.configStore },
		});
	}

	updateConfiguration(config: ChartConfig): void {
		this.configStore.set(config);
		this.chart.invalidate(); // Wrapper handles the update
	}
}
```

#### 3. Svelte Chart Component

```svelte
<script>
	import ChartPanel from '@ticatec/uniface-echarts';
	import ConfigurationPanel from './ConfigurationPanel.svelte';

	export let chart;
	export let configStore;
</script>

<div class="chart-container">
	<ChartPanel chart={chart} />
	<ConfigurationPanel configStore={configStore} on:configChange={() => chart.invalidate()} />
</div>
```

#### 4. Configuration Management

```typescript
// Use Svelte stores for reactive configuration
const configStore = writable<ChartConfig>(defaultConfig);

// Derived store for processed data
const processedData = derived([configStore, basesData], ([config, data]) => transformData(data, config));

// Update chart when configuration changes
configStore.subscribe(() => {
	chart.invalidate(); // Wrapper handles the rest
});
```

````

### State Management

#### Wrapper-Based State Management

```typescript
// Simple Svelte stores for configuration
const configStore = writable<ChartConfig>(defaultConfig);
const panelStore = writable<PanelState>({ visible: false, position: { x: 100, y: 100 } });

// Chart classes handle their own data transformation
export class ConfigurableChart extends UnifaceChart {
	private config: ChartConfig = defaultConfig;

	updateConfig(newConfig: ChartConfig): void {
		this.config = newConfig;
		this.invalidate(); // Wrapper automatically calls createOption()
	}

	protected createOption(): any {
		// Transform current config to ECharts options
		return this.transformConfigToEChartsOptions(this.config);
	}
}
````

#### Reactive Updates

```typescript
// Configuration changes trigger automatic chart updates
configStore.subscribe(config => {
	chart.updateConfig(config);
	// No manual chart management needed - wrapper handles everything
});

// Panel state is managed separately
panelStore.subscribe(panelState => {
	// Update panel visibility/position
	// No chart updates needed for panel state changes
});
```

### Data Models

#### ECharts Data Format

```typescript
interface EChartsDataset {
	source: Array<Record<string, any>>;
	dimensions: string[];
	sourceHeader: boolean;
}

interface ProcessedChartData {
	datasets: EChartsDataset[];
	series: SeriesConfig[];
	axes: AxisConfig[];
	legend: LegendConfig;
}
```

#### Data Transformation Pipeline

```typescript
interface DataTransformationPipeline {
	input: BasesData;
	steps: [ValidateInput, NormalizeData, ApplyFilters, GroupAndAggregate, FormatForECharts, ValidateOutput];
	output: ProcessedChartData;
}
```

## Configuration Panel Design

### Panel Structure

The floating configuration panel will be organized into collapsible sections:

#### 1. Data Section

- **Data Source**: Column selection, filtering, sorting
- **Transformations**: Aggregations, calculations, grouping
- **Filtering**: Advanced data filtering with conditions
- **Statistics**: Basic statistical analysis of selected data

#### 2. Appearance Section

- **Colors**: Theme selection, custom color palettes, gradients
- **Typography**: Font families, sizes, weights, colors
- **Layout**: Margins, padding, spacing, alignment
- **Background**: Colors, patterns, images, transparency

#### 3. Axes Section

- **X-Axis**: Type, scale, range, labels, ticks, grid lines
- **Y-Axis**: Multiple axes support, scale, range, labels, ticks
- **Axis Styling**: Colors, line styles, label formatting
- **Grid**: Grid line styles, colors, patterns

#### 4. Series Section

- **Series Types**: Line, bar, scatter, area, mixed charts
- **Series Styling**: Colors, line styles, point styles, fill patterns
- **Data Labels**: Position, formatting, visibility, styling
- **Stacking**: Stack configuration for bar and area charts

#### 5. Legend Section

- **Position**: Top, bottom, left, right, custom positioning
- **Styling**: Colors, fonts, borders, background
- **Behavior**: Interactive legend, selection, highlighting
- **Custom Items**: Custom legend entries and formatting

#### 6. Interaction Section

- **Zoom**: Zoom controls, zoom areas, zoom behavior
- **Pan**: Pan controls and behavior
- **Selection**: Data point selection, brush selection
- **Tooltips**: Custom tooltip content, styling, positioning
- **Click Events**: Custom click handlers, navigation

#### 7. Animation Section

- **Entry Animations**: Chart load animations, timing, easing
- **Update Animations**: Data update animations, transitions
- **Interaction Animations**: Hover effects, selection animations
- **Performance**: Animation performance settings

#### 8. Export Section

- **Image Export**: PNG, SVG, PDF export options
- **Data Export**: CSV, JSON, Excel export
- **Configuration Export**: Save/load chart configurations
- **Print Options**: Print-friendly formatting

### Panel UI Components

#### Collapsible Sections

```svelte
<ConfigSection title="Appearance" icon="palette" bind:expanded={sections.appearance}>
	<ColorPicker bind:value={config.colors.primary} />
	<FontSelector bind:value={config.typography.font} />
	<ThemeSelector bind:value={config.theme} />
</ConfigSection>
```

#### Smart Controls

- **Color Picker**: Advanced color picker with palettes, gradients, opacity
- **Font Selector**: Font family, size, weight, style selection
- **Number Input**: Range sliders, steppers, direct input
- **Dropdown**: Searchable dropdowns with icons and descriptions
- **Toggle Groups**: Multiple selection toggles with visual feedback

## Error Handling

### Error Boundaries

```typescript
interface ErrorBoundary {
	catchDataErrors(error: DataError): void;
	catchRenderErrors(error: RenderError): void;
	catchConfigErrors(error: ConfigError): void;
	recoverFromError(error: ChartError): RecoveryAction;
}
```

### Validation System

```typescript
interface ValidationSystem {
	validateData(data: any): ValidationResult;
	validateConfig(config: ChartConfig): ValidationResult;
	validateEChartsOptions(options: EChartsOption): ValidationResult;
	suggestFixes(errors: ValidationError[]): Fix[];
}
```

## Testing Strategy

### Unit Testing

- **Data Processing**: Test all data transformation functions
- **Configuration**: Test configuration validation and serialization
- **State Management**: Test reactive state updates and persistence
- **ECharts Integration**: Test chart creation, updates, and destruction

### Integration Testing

- **End-to-End**: Test complete chart creation and interaction workflows
- **Data Flow**: Test data flow from Obsidian to ECharts rendering
- **Configuration Panel**: Test all configuration options and their effects
- **State Persistence**: Test configuration saving and loading

### Performance Testing

- **Large Datasets**: Test performance with large amounts of data
- **Configuration Changes**: Test responsiveness of configuration updates
- **Memory Usage**: Test for memory leaks in chart instances
- **Rendering Performance**: Test chart rendering and animation performance

## Implementation Phases

### Phase 1: Core Infrastructure

1. Set up @ticatec/uniface-echarts integration
2. Implement basic chart view with ECharts6
3. Create reactive state management system
4. Build data transformation pipeline

### Phase 2: Configuration Panel

1. Design and implement floating panel UI
2. Create configuration sections and controls
3. Implement real-time configuration updates
4. Add state persistence and synchronization

### Phase 3: Advanced Features

1. Implement comprehensive ECharts6 options
2. Add data manipulation and filtering tools
3. Create export and import functionality
4. Add advanced interaction features

### Phase 4: Polish and Optimization

1. Performance optimization and testing
2. Error handling and validation
3. Documentation and examples
4. Final testing and bug fixes

## Technology Stack

### Core Libraries

- **@ticatec/uniface-echarts**: ECharts6 wrapper
- **Apache ECharts 6**: Core charting library
- **Svelte 5**: UI framework with runes
- **TypeScript**: Type safety and development experience

### State Management

- **Svelte Stores**: Reactive state management
- **Immer**: Immutable state updates
- **Zod**: Runtime type validation

### UI Components

- **Lucide Icons**: Consistent iconography
- **Floating UI**: Positioning for floating panel
- **Headless UI**: Accessible UI primitives

### Development Tools

- **Vite**: Build tool and development server
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **ESLint + Prettier**: Code quality and formatting
