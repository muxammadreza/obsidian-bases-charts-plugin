<script lang="ts">
	import { onMount } from 'svelte';
	import type { DataWrapper } from '../ChartData';
	import { buildChartConfig } from '../echarts/config';
	import { buildLineOptions } from '../echarts/options';
	import type { ChartView } from '../ChartView';
	import PlotGrid from './PlotGrid.svelte';

	interface Props {
		view: ChartView;
	}

	let { view }: Props = $props();

	let chartConfig = $state(buildChartConfig(view, { chartType: 'line' }));
	let parseErrors = $derived(chartConfig.overrideParseErrors ?? []);

	function refreshConfig(): void {
		chartConfig = buildChartConfig(view, { chartType: 'line' });
	}

	onMount(() => {
		refreshConfig();
		view.events.on('data-updated', refreshConfig);
		return () => {
			view.events.off('data-updated', refreshConfig);
		};
	});

	function buildOption({ data, chartIndex }: { data: DataWrapper; chartIndex: number }) {
		const result = buildLineOptions(data, chartIndex, chartConfig);
		return {
			option: result.option,
			overrideErrors: result.overrideErrors,
		};
	}
</script>

<PlotGrid view={view} xAxisLabel={chartConfig.xAxisLabel} buildOption={buildOption} globalErrors={parseErrors}></PlotGrid>
