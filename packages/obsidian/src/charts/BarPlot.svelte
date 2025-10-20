<script lang="ts">
	import { onMount } from 'svelte';
	import type { DataWrapper } from '../ChartData';
	import { buildChartConfig } from '../echarts/config';
	import { createDefaultConfigStackState } from './config-stack/state';
	import { buildBarOptions } from '../echarts/options';
	import type { ChartView } from '../ChartView';
	import PlotGrid from './PlotGrid.svelte';

	interface Props {
		view: ChartView;
	}

let { view }: Props = $props();

let chartConfig = $state(buildChartConfig(view, { chartType: 'bar' }));

function refreshConfig(): void {
	chartConfig = buildChartConfig(view, { chartType: 'bar' });
}

	onMount(() => {
		refreshConfig();
		view.events.on('data-updated', refreshConfig);
		return () => {
			view.events.off('data-updated', refreshConfig);
		};
	});

function buildOption({ data, chartIndex }: { data: DataWrapper; chartIndex: number }) {
	const result = buildBarOptions(data, chartIndex, chartConfig);
	return {
		option: result.option,
		errors: result.errors,
		defaultStackState: createDefaultConfigStackState(chartConfig),
	};
}
</script>

<PlotGrid view={view} xAxisLabel={chartConfig.xAxisLabel} buildOption={buildOption}></PlotGrid>
