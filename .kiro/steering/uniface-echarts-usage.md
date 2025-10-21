---
inclusion: always
---

# @ticatec/uniface-echarts Usage Guidelines

## CRITICAL: Use the Wrapper Properly

**MANDATORY:** All ECharts implementation MUST use the @ticatec/uniface-echarts wrapper instead of direct ECharts API calls. This wrapper provides automatic state management, lifecycle handling, and Svelte integration.
@ticatec/uniface-echarts Requirements
Node.js >= 18.0.0
Svelte >= 5.0.0
ECharts >= 6.0.0

## Core Architecture

### 1. Chart Classes (Extend UnifaceChart)

```typescript
import UnifaceChart from '@ticatec/uniface-echarts';

export class ScatterChart extends UnifaceChart {
	protected createOption(): any {
		// Return ECharts option object
		// This is the ONLY place to define chart configuration
		return {
			// ECharts configuration
		};
	}

	protected postInitialize(chart: any): void {
		// Set up event handlers ONLY here
		this.setEventHandlers({
			onClick: params => {
				/* handle click */
			},
			onDoubleClick: params => {
				/* handle double click */
			},
		});
	}
}
```

### 2. Svelte Components (Use ChartPanel)

```svelte
<script>
	import { ChartPanel } from '@ticatec/uniface-echarts';
	import { ScatterChart } from './charts/ScatterChart';

	const chart = new ScatterChart(chartView);
</script>

<div class="chart-container">
	<ChartPanel chart={chart} />
</div>
```

## What the Wrapper Handles Automatically

- **Chart Instance Management**: Creation, destruction, cleanup
- **Resize Handling**: Automatic chart resizing
- **State Management**: Internal chart state and updates
- **Event System**: Built-in event handling infrastructure
- **Lifecycle Management**: Proper initialization and cleanup
- **Loading States**: Built-in loading/hideLoading methods

## What You Should NOT Do

- ❌ Direct ECharts API calls (`echarts.init()`, `chart.setOption()`)
- ❌ Manual instance management or cleanup
- ❌ Custom resize observers or event listeners
- ❌ Manual state management for chart data
- ❌ Direct DOM manipulation for chart containers

## What You SHOULD Do

- ✅ Extend UnifaceChart for each chart type
- ✅ Override `createOption()` to return ECharts configuration
- ✅ Use `postInitialize()` for event setup
- ✅ Use ChartPanel component in Svelte
- ✅ Let the wrapper handle all lifecycle and state management
- ✅ Use built-in methods: `invalidate()`, `resize()`, `showLoading()`, `hideLoading()`

## Data Updates

To update chart data, use the updateData() method which calls invalidate() internally:

```typescript
// CORRECT: Update data through public method
public updateData(dataWrapper: DataWrapper): void {
	this.dataWrapper = dataWrapper;
	this.invalidate(); // Wrapper handles the rest
}

// CORRECT: Update configuration through public method  
public updateConfig(config: ChartConfig): void {
	const validation = validateChartConfig(config);
	if (validation.success && validation.data) {
		this.config = validation.data;
		this.invalidate();
	}
}
```

## Event Handling

Use the wrapper's event system instead of direct ECharts events:

```typescript
protected postInitialize(chart: any): void {
  this.setEventHandlers({
    onClick: (params) => {
      // Handle click - params contains ECharts event data
      this.highlight(params.seriesIndex, params.dataIndex);
    },
    onDoubleClick: (params) => {
      // Handle double click
      // Use Obsidian APIs for file navigation
    }
  });
}
```

## Integration with Obsidian

The chart classes should integrate with Obsidian's data and navigation:

```typescript
export class ScatterChart extends UnifaceChart {
	private readonly chartView: ChartView;
	private dataWrapper: DataWrapper | null = null;
	private config: ChartConfig | null = null;

	constructor(chartView: ChartView) {
		super();
		this.chartView = chartView;
	}

	public updateData(dataWrapper: DataWrapper): void {
		this.dataWrapper = dataWrapper;
		this.invalidate();
	}

	public updateConfig(config: ChartConfig): void {
		this.config = config;
		this.invalidate();
	}

	protected createOption(): Record<string, unknown> {
		// Use this.dataWrapper and this.config to generate ECharts options
		return this.transformDataToEChartsOptions();
	}

	protected postInitialize(chart: unknown): void {
		this.setEventHandlers({
			onClick: params => {
				const data = params.data as ProcessedData;
				if (data?.file) {
					void this.chartView.openFile(data.file, false);
				}
			},
			onDoubleClick: params => {
				const data = params.data as ProcessedData;
				if (data?.file) {
					void this.chartView.openFile(data.file, true);
				}
			},
		});
	}
}
```

## Configuration Updates

For real-time configuration updates, use the updateData() and updateConfig() methods:

```typescript
export class ScatterChart extends UnifaceChart {
	private readonly chartView: ChartView;
	private dataWrapper: DataWrapper | null = null;
	private config: ChartConfig | null = null;

	public updateData(dataWrapper: DataWrapper): void {
		this.dataWrapper = dataWrapper;
		this.invalidate(); // Wrapper will call createOption() with new data
	}

	public updateConfig(config: ChartConfig): void {
		const validation = validateChartConfig(config);
		if (validation.success && validation.data) {
			this.config = validation.data;
			this.invalidate(); // Wrapper will call createOption() with new config
		}
	}

	protected createOption(): Record<string, unknown> {
		// Use this.dataWrapper and this.config to generate ECharts options
		return this.transformConfigToEChartsOptions();
	}
}
```

## Validation and Error Handling

### Configuration Validation
```typescript
import { validateChartConfig } from 'packages/obsidian/src/utils/configValidation';

public updateConfig(config: ChartConfig): void {
	try {
		const validation = validateChartConfig(config);
		if (validation.success && validation.data) {
			this.config = validation.data;
			this.invalidate();
		} else {
			console.error('Invalid chart configuration:', validation.errors);
			// Keep current configuration on validation error
		}
	} catch (error) {
		console.error('Failed to update chart configuration:', error);
	}
}
```

### Error Handling in createOption()
```typescript
protected createOption(): Record<string, unknown> {
	try {
		if (!this.dataWrapper) {
			console.warn('ScatterChart: No data wrapper available');
			return this.createEmptyOption();
		}

		// Chart configuration logic...
		return chartOptions;
	} catch (error) {
		console.error('ScatterChart: Failed to create chart options:', error);
		return this.createEmptyOption('Error creating chart configuration');
	}
}
```

## Key Benefits of Using the Wrapper

1. **Automatic Lifecycle Management**: No manual cleanup needed
2. **Built-in Reactivity**: Automatic updates when data changes
3. **Event System**: Simplified event handling
4. **Svelte Integration**: Seamless integration with Svelte components
5. **Performance**: Optimized rendering and updates
6. **Error Handling**: Built-in error boundaries and recovery
7. **Type Safety**: Full TypeScript support with proper typing
8. **Validation**: Built-in configuration validation with Zod schemas

## NEVER Do Manual Implementation

The wrapper eliminates the need for:

- ChartInstanceManager (wrapper handles this)
- Manual resize observers (wrapper handles this)
- Custom state management (wrapper handles this)
- Manual event setup (wrapper provides event system)
- DOM manipulation (wrapper handles containers)

Always use the wrapper's built-in capabilities instead of reimplementing them manually.
