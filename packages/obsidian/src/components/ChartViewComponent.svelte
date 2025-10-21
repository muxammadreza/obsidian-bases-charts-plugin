<script lang="ts">
	import { ChartPanel } from '@ticatec/uniface-echarts';
	import type { ChartView } from 'packages/obsidian/src/ChartView';
	import { ScatterChart, LineChart, BarChart } from 'packages/obsidian/src/charts';
	import { SCATTER_CHART_VIEW_TYPE, LINE_CHART_VIEW_TYPE, BAR_CHART_VIEW_TYPE } from 'packages/obsidian/src/ChartView';
	import type { DataWrapper } from 'packages/obsidian/src/ChartData';
	import { createChartConfigStore, createPanelStateStore } from 'packages/obsidian/src/stores';
	import ConfigurationPanel from './ConfigurationPanel.svelte';
	import ErrorBoundary from './ErrorBoundary.svelte';
	import { DEFAULT_CONFIG_DEBOUNCE_DELAY } from 'packages/obsidian/src/utils/debounce';

	interface Props {
		chartView: ChartView;
	}

	let { chartView }: Props = $props();

	// Create configuration stores
	const configStore = createChartConfigStore();
	const panelStore = createPanelStateStore();

	// Create chart instance based on chart type
	let chart: ScatterChart | LineChart | BarChart | undefined = $state(createChartInstance($configStore.chartType));

	// Create debounced configuration update function
	let configUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	function debouncedUpdateConfig(config: import('packages/obsidian/src/stores').ChartConfig): void {
		if (configUpdateTimeout) {
			clearTimeout(configUpdateTimeout);
		}
		configUpdateTimeout = setTimeout(() => {
			updateChartConfig(config);
			configUpdateTimeout = null;
		}, DEFAULT_CONFIG_DEBOUNCE_DELAY);
	}

	// Update chart when data changes
	$effect(() => {
		try {
			const dataWrapper = chartView.processData();
			updateChartData(dataWrapper);
		} catch (error) {
			console.error('ChartViewComponent: Error in data update effect:', error);
		}
	});

	// Update chart when configuration changes (debounced)
	$effect(() => {
		try {
			const config = $configStore;
			debouncedUpdateConfig(config);
		} catch (error) {
			console.error('ChartViewComponent: Error in config update effect:', error);
		}
	});

	// Recreate chart instance when chart type changes
	$effect(() => {
		try {
			const newChartType = $configStore.chartType;
			chart = createChartInstance(newChartType);
		} catch (error) {
			console.error('ChartViewComponent: Error in chart type change effect:', error);
		}
	});

	// Listen for data updates from ChartView
	try {
		chartView.events.on('data-updated', () => {
			try {
				const dataWrapper = chartView.processData();
				updateChartData(dataWrapper);
			} catch (error) {
				console.error('ChartViewComponent: Error handling data-updated event:', error);
			}
		});
	} catch (error) {
		console.error('ChartViewComponent: Failed to set up data-updated event listener:', error);
	}

	/**
	 * Creates the appropriate chart instance based on the view type
	 */
	function createChartInstance(chartType: string): ScatterChart | LineChart | BarChart | undefined {
		try {
			if (!chartView) {
				console.error('ChartViewComponent: No chart view provided');
				return undefined;
			}

			switch (chartType) {
				case SCATTER_CHART_VIEW_TYPE:
					return new ScatterChart(chartView);
				case LINE_CHART_VIEW_TYPE:
					return new LineChart(chartView);
				case BAR_CHART_VIEW_TYPE:
					return new BarChart(chartView);
				default:
					console.error(`ChartViewComponent: Unknown chart type: ${chartType}`);
					return undefined;
			}
		} catch (error) {
			console.error('ChartViewComponent: Failed to create chart instance:', error);
			return undefined;
		}
	}

	/**
	 * Updates chart data and triggers refresh
	 */
	function updateChartData(dataWrapper: DataWrapper): void {
		try {
			if (!chart) {
				console.warn('ChartViewComponent: No chart instance available for data update');
				return;
			}

			if (typeof chart.updateData !== 'function') {
				console.error('ChartViewComponent: Chart instance does not have updateData method');
				return;
			}

			chart.updateData(dataWrapper);
		} catch (error) {
			console.error('ChartViewComponent: Failed to update chart data:', error);
		}
	}

	/**
	 * Updates chart configuration and triggers refresh
	 */
	function updateChartConfig(config: import('packages/obsidian/src/stores').ChartConfig): void {
		try {
			if (!chart) {
				console.warn('ChartViewComponent: No chart instance available for config update');
				return;
			}

			if (typeof chart.updateConfig !== 'function') {
				console.error('ChartViewComponent: Chart instance does not have updateConfig method');
				return;
			}

			chart.updateConfig(config);
		} catch (error) {
			console.error('ChartViewComponent: Failed to update chart configuration:', error);
		}
	}
</script>

<div class="chart-container">
	<ErrorBoundary fallback="Failed to render chart. Please check your data configuration." onError={error => console.error('Chart rendering error:', error)}>
		{#snippet children()}
			<ChartPanel chart={chart} />
		{/snippet}
	</ErrorBoundary>
	<ErrorBoundary fallback="Failed to render configuration panel." onError={error => console.error('Configuration panel error:', error)}>
		{#snippet children()}
			<ConfigurationPanel panelStore={panelStore} configStore={configStore} />
		{/snippet}
	</ErrorBoundary>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 100%;
		min-height: 400px;
		position: relative;
	}
</style>
