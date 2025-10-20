<script lang="ts">
	import { onMount } from 'svelte';
import type { ChartOptionResult } from '../echarts/options';
import type { ConfigStackState } from './config-stack/types';
	import { collectLegendMetadata, type DataWrapper, type LegendMetadata } from '../ChartData';
	import type { ChartView } from '../ChartView';
	import PlotGridItem from './PlotGridItem.svelte';

	interface BuildOptionArgs {
		data: DataWrapper;
		chartIndex: number;
	}

interface BuildOptionResult extends Pick<ChartOptionResult, 'option' | 'errors'> {
	defaultStackState: ConfigStackState;
}

	interface Props {
		view: ChartView;
		xAxisLabel: string;
		buildOption: (args: BuildOptionArgs) => BuildOptionResult;
		globalErrors?: string[];
	}

let { view, xAxisLabel, buildOption, globalErrors = [] }: Props = $props();

	let data: DataWrapper | null = $state(null) as DataWrapper | null;
	let legendEntries: LegendMetadata[] = $derived(data ? collectLegendMetadata(data) : []);
	let xLabel: string = $derived(xAxisLabel);
	let topLevelErrors: string[] = $derived([...new Set(globalErrors.filter(Boolean))]);

	function refresh(): void {
		data = view.processData();
	}

	onMount(() => {
		refresh();
		view.events.on('data-updated', refresh);

		return () => {
			view.events.off('data-updated', refresh);
		};
	});
</script>

{#if topLevelErrors.length > 0}
	<div class="bases-charts-error-banner" role="alert">
		{#each topLevelErrors as error}
			<span class="bases-charts-error-chip">{error}</span>
		{/each}
	</div>
{/if}

<div class="bases-charts-plot-legend">
	{#if legendEntries.length > 0}
		{#each legendEntries as entry}
			<div class="bases-charts-plot-legend-item">
				<div class="bases-charts-plot-legend-color" style="--color: {entry.color}"></div>
				<span class="bases-charts-plot-legend-label">{entry.label}</span>
			</div>
		{/each}
	{/if}
</div>

<div class="bases-charts-plot-grid">
	{#if data}
		{#if data.getChartIdentifiers().length > 0}
	{#each data.getChartIdentifiers() as _, chartIndex}
		{@const chartName = data.getChartName(chartIndex)}
		{@const chartIdentifier = view.getChartIdentifier(chartIndex, chartName)}
		{@const result = buildOption({ data, chartIndex })}
		{@const storedState = view.getConfigStackState(chartIdentifier)}
		{@const stackState = storedState ?? result.defaultStackState}
		<PlotGridItem
			view={view}
			chartName={chartName}
			xAxisLabel={xLabel}
			option={result.option}
			errors={result.errors}
			chartIdentifier={chartIdentifier}
			stackState={stackState}
		></PlotGridItem>
			{/each}
		{:else}
			<p>No properties selected</p>
		{/if}
	{:else}
		<p>No data to display</p>
	{/if}
</div>

<style>
	.bases-charts-plot-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--bases-charts-min-width), 1fr));
		gap: var(--size-4-4);
		width: 100%;
		height: 100%;
	}

	.bases-charts-error-banner {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-2-2);
		margin-bottom: var(--size-4-3);
		padding: var(--size-2-3) var(--size-4-2);
		border-radius: var(--radius-s);
		background-color: #d72c2c;
		color: #ffffff;
	}

	.bases-charts-error-chip {
		padding: var(--size-2-1) var(--size-2-3);
		border-radius: var(--radius-s);
		background-color: rgba(0, 0, 0, 0.2);
		color: inherit;
		font-size: var(--font-small);
		max-width: 100%;
	}

	.bases-charts-plot-legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-4-3);
	}

	.bases-charts-plot-legend-item {
		display: flex;
		align-items: center;
		gap: var(--size-2-2);
		font-size: var(--font-small);
		color: var(--bases-charts-text);
	}

	.bases-charts-plot-legend-color {
		width: var(--size-4-4);
		height: var(--size-4-4);
		background-color: var(--color);
	}
</style>
