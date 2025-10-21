<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { ChartConfig } from 'packages/obsidian/src/stores';
	import { SCATTER_CHART_VIEW_TYPE, LINE_CHART_VIEW_TYPE, BAR_CHART_VIEW_TYPE } from 'packages/obsidian/src/ChartView';
	import './section-title.css';

	interface Props {
		configStore: Writable<ChartConfig>;
	}

	let { configStore }: Props = $props();

	let config = $state($configStore);

	function updateChartType(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newChartType = target.value;
		configStore.update(c => ({ ...c, chartType: newChartType }));
	}
</script>

<div class="config-section">
	<h4 class="section-title">Chart Type</h4>
	<select class="chart-type-select" onchange={updateChartType} value={config.chartType}>
		<option value={SCATTER_CHART_VIEW_TYPE}>Scatter</option>
		<option value={LINE_CHART_VIEW_TYPE}>Line</option>
		<option value={BAR_CHART_VIEW_TYPE}>Bar</option>
	</select>
</div>

<style>
	.chart-type-select {
		width: 100%;
		padding: 8px;
		border-radius: 4px;
		border: 1px solid var(--background-modifier-border);
	}
</style>
