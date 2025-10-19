<script lang="ts">
	import type { ChartView } from '../ChartView';
	import type { EChartsDatum, EChartsOption } from '../echarts/options';
	import EChartsPlot from './EChartsPlot.svelte';

	interface Props {
		view: ChartView;
		chartName: string;
		xAxisLabel: string;
		option: EChartsOption;
		overrideErrors?: string[];
		forceRender?: boolean;
	}

	let { view, chartName, xAxisLabel, option, overrideErrors = [], forceRender = false }: Props = $props();

	let width = $state(0);
	let height = $state(0);
	let enoughSpace = $derived(forceRender || (width > 100 && height > 100));

	function handlePointClick(datum: EChartsDatum, params: unknown): void {
		const native = (params as { event?: MouseEvent })?.event;
		const newTab = Boolean(native?.ctrlKey || native?.metaKey);
		void view.openFile(datum.file, newTab);
	}

	function handleRenderError(message: string): void {
		view.notifyError(message);
	}
</script>

<div class="bases-charts-plot-grid-item" bind:clientWidth={width} bind:clientHeight={height}>
	{#if enoughSpace}
		{#if overrideErrors.length > 0}
			<div class="bases-charts-override-errors" role="alert">
				{#each [...new Set(overrideErrors)] as message}
					<span class="bases-charts-override-chip">{message}</span>
				{/each}
			</div>
		{/if}
		<EChartsPlot
			option={option}
			height={height}
			width={width}
			chartName={chartName}
			xAxisLabel={xAxisLabel}
			onDataPointClick={handlePointClick}
			onRenderError={handleRenderError}
		></EChartsPlot>
	{:else}
		<span>Not enough space to display chart.</span>
	{/if}
</div>

<style>
	.bases-charts-plot-grid-item {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: var(--bases-charts-min-height);
		min-width: var(--bases-charts-min-width);
	}

	.bases-charts-override-errors {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-2-2);
		margin-bottom: var(--size-4-2);
	}

	.bases-charts-override-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--size-2-1);
		padding: var(--size-2-1) var(--size-2-3);
		border-radius: var(--radius-s);
		background-color: #d72c2c;
		color: #ffffff;
		font-size: var(--font-small);
	}

	.bases-charts-override-chip::before {
		content: '⚠';
		font-size: 0.9em;
	}
</style>
