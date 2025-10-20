<script lang="ts">
	import type { EChartsDatum } from 'packages/obsidian/src/echarts/dataPipeline';
	import type { EChartsOption } from 'packages/obsidian/src/echarts/options';

	let { option, width, height, chartName, xAxisLabel, onDataPointClick } = $props<{
		option: EChartsOption;
		width: number;
		height: number;
		chartName: string;
		xAxisLabel: string;
		onDataPointClick?: (datum: EChartsDatum, params: unknown) => void;
	}>();

	const firstDatum = $derived(() => {
		const injected = (option as { __testDatum?: EChartsDatum }).__testDatum;
		if (injected) {
			return injected;
		}
		const series = Array.isArray(option?.series) ? option.series[0] : undefined;
		if (!series) {
			return undefined;
		}
		const data = Array.isArray(series.data) ? series.data[0] : undefined;
		return data as EChartsDatum | undefined;
	});

	$effect(() => {
		(globalThis as { __mockLatestOption?: EChartsOption }).__mockLatestOption = option;
	});

	function triggerClick(newTab: boolean): void {
		if (!onDataPointClick) {
			return;
		}
		const datum = firstDatum
			? ({
					...firstDatum,
					file: firstDatum.file ?? 'notes/a.md',
				} satisfies EChartsDatum)
			: ({
					value: [0, 0] as [number, number],
					rawX: 0,
					xKey: '0',
					file: 'notes/a.md',
					groupIndex: 0,
					chartIndex: 0,
				} satisfies EChartsDatum);
		const event = new MouseEvent('click', { ctrlKey: newTab, metaKey: newTab });
		onDataPointClick(datum, { event });
	}
</script>

<div class="mock-echarts" data-width={width} data-height={height} aria-label={`Mock chart for ${chartName} with X axis ${xAxisLabel}`}>
	<button data-testid="mock-echarts-click" type="button" on:click={() => triggerClick(false)}> Trigger Click </button>
	<button data-testid="mock-echarts-click-newtab" type="button" on:click={() => triggerClick(true)}> Trigger Click (New Tab) </button>
</div>
