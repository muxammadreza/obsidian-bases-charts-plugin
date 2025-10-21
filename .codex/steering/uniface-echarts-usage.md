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
	import ChartPanel from '@ticatec/uniface-echarts';
	import { ScatterChart } from './charts/ScatterChart';

	const chart = new ScatterChart();
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

To update chart data, simply call `chart.invalidate()` after updating the data source. The wrapper will automatically call `createOption()` again and update the chart.

```typescript
// Update data and refresh chart
this.data = newData;
this.chart.invalidate(); // Wrapper handles the rest
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
export class ObsidianScatterChart extends UnifaceChart {
	constructor(private basesView: EChartsChartView) {
		super();
	}

	protected createOption(): any {
		// Get data from basesView
		const data = this.basesView.getProcessedData();
		return {
			// ECharts configuration using Obsidian data
		};
	}

	protected postInitialize(chart: any): void {
		this.setEventHandlers({
			onClick: params => {
				// Use basesView for file navigation
				if (params.data?.file) {
					this.basesView.openFile(params.data.file, false);
				}
			},
		});
	}
}
```

## Configuration Updates

For real-time configuration updates, create methods that update internal state and call `invalidate()`:

```typescript
export class ConfigurableChart extends UnifaceChart {
	private config: ChartConfig;

	updateConfiguration(newConfig: ChartConfig): void {
		this.config = newConfig;
		this.invalidate(); // Wrapper will call createOption() with new config
	}

	protected createOption(): any {
		// Use this.config to generate ECharts options
		return this.transformConfigToEChartsOptions(this.config);
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

## NEVER Do Manual Implementation

The wrapper eliminates the need for:

- ChartInstanceManager (wrapper handles this)
- Manual resize observers (wrapper handles this)
- Custom state management (wrapper handles this)
- Manual event setup (wrapper provides event system)
- DOM manipulation (wrapper handles containers)

Always use the wrapper's built-in capabilities instead of reimplementing them manually.
