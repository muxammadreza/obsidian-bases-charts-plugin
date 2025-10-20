<script lang="ts">
	import ChartPanel from '@ticatec/uniface-echarts/ChartPanel.svelte';
	import type ChartEventParams from '@ticatec/uniface-echarts/dist/ChartEventParams';
	import type { EChartsOption } from '../echarts/options';
	import { coerceDatumFromEventPayload } from '../echarts/options';
	import type { EChartsDatum } from '../echarts/dataPipeline';
	import { createChartInstance } from '../echarts/runtime';

	interface Props {
		option: EChartsOption;
		width: number;
		height: number;
		chartName: string;
		xAxisLabel: string;
		onDataPointClick?: (datum: EChartsDatum, params: unknown) => void;
		onDataPointHover?: (datum: EChartsDatum | null, params: unknown) => void;
		onRenderError?: (message: string) => void;
	}

	let { option, width, height, chartName, xAxisLabel, onDataPointClick, onDataPointHover, onRenderError }: Props =
		$props();

	let renderError: string | null = $state(null);
let runtime = $state(createChartInstance({ initialOption: option, onError: handleRuntimeError }));

	function reportError(error: unknown): void {
		const message = error instanceof Error ? error.message : 'Unknown rendering error.';
		renderError = message;
		onRenderError?.(message);
	}

	$effect(() => {
		if (!runtime) {
			return;
		}
		renderError = null;
		runtime.setOption(option);
	});

	$effect(() => {
		runtime.setEvents({
			onClick: handleClick,
			onMouseOver: handleMouseOver,
			onMouseOut: handleMouseOut,
		});
	});

	function handleRuntimeError(message: string, error: unknown): void {
		const actualMessage = error instanceof Error ? error.message : message;
		renderError = actualMessage;
		onRenderError?.(actualMessage);
		console.error(actualMessage, error);
	}

	function handleClick(event: ChartEventParams): void {
		const datum = coerceDatumFromEventPayload(event);
		if (datum) {
			onDataPointClick?.(datum, event);
		}
	}

	function handleMouseOver(event: ChartEventParams): void {
		const datum = coerceDatumFromEventPayload(event) ?? null;
		onDataPointHover?.(datum, event);
	}

	function handleMouseOut(event: ChartEventParams): void {
		onDataPointHover?.(null, event);
	}

	$effect(() => () => {
		runtime.dispose();
	});
</script>

<div class="echarts-plot" style={`width: ${width}px; height: ${height}px;`}>
	{#if renderError}
		<div class="echarts-fallback">
			<p>Chart failed to render for <span class="echarts-name">{chartName}</span>.</p>
			<p class="echarts-error-message">{renderError}</p>
		</div>
	{:else}
		<ChartPanel
			chart={runtime.chart}
			aria-label={`ECharts plot for ${chartName} with X axis ${xAxisLabel}`}
		/>
	{/if}
</div>

<style>
	.echarts-plot {
		position: relative;
	}

	.echarts-fallback {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--size-4-2);
		width: 100%;
		height: 100%;
		border: 1px solid #d72c2c;
		border-radius: var(--radius-s);
		padding: var(--size-4-4);
		text-align: center;
		background-color: rgba(215, 44, 44, 0.12);
		color: var(--bases-charts-text);
	}

	.echarts-name {
		font-weight: 600;
	}

	.echarts-error-message {
		font-size: var(--font-small);
	}
</style>
