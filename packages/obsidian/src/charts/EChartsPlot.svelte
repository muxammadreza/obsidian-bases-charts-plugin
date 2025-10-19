<script lang="ts">
	import { Chart as SvelteECharts } from 'svelte-echarts';
	import * as echarts from 'echarts';
	import type { EChartsInitOpts } from 'echarts';
	import type { EChartsDatum, EChartsOption } from '../echarts/options';
	import { ensureEChartsTheme } from '../echarts/theme';

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

	let { option, width, height, chartName, xAxisLabel, onDataPointClick, onDataPointHover, onRenderError }: Props = $props();

	let chartInstance: echarts.EChartsType | null = $state(null);
	let renderError: string | null = $state(null);
	const themeName = ensureEChartsTheme();

	function reportError(error: unknown): void {
		const message = error instanceof Error ? error.message : 'Unknown rendering error.';
		renderError = message;
		onRenderError?.(message);
	}

	function initWithTheme(element: HTMLDivElement, _theme?: string, initOptions?: EChartsInitOpts): echarts.EChartsType {
		try {
			const instance = echarts.init(element, themeName, initOptions);
			renderError = null;
			return instance;
		} catch (error) {
			reportError(error);
			return createFallbackInstance();
		}
	}

	function createFallbackInstance(): echarts.EChartsType {
		const noop = (): void => {};
		return {
			setOption: noop,
			dispose: noop,
			resize: noop,
			on: noop as unknown as echarts.EChartsType['on'],
			off: noop as unknown as echarts.EChartsType['off'],
			once: noop as unknown as echarts.EChartsType['once'],
			disableDataZoom: noop,
			enableDataZoom: noop,
			disableSilentDownplay: noop,
			enableLarge: noop,
			enableLightAnimation: noop,
			disableGraphicLarge: noop,
			disableLargeBrush: noop,
			enableParallel: noop,
			enable: noop,
			disable: noop,
		} as unknown as echarts.EChartsType;
	}

	$effect(() => {
		if (chartInstance) {
			try {
				renderError = null;
				chartInstance.setOption(option, { notMerge: true, lazyUpdate: false });
			} catch (error) {
				reportError(error);
			}
		}
	});

	function handleClick(event: unknown): void {
		const datum = (event as { data?: EChartsDatum }).data;
		if (datum) {
			onDataPointClick?.(datum, event);
		}
	}

	function handleMouseOver(event: unknown): void {
		const datum = (event as { data?: EChartsDatum }).data ?? null;
		onDataPointHover?.(datum, event);
	}

	function handleMouseOut(event: unknown): void {
		onDataPointHover?.(null, event);
	}
</script>

<div class="echarts-plot" style={`width: ${width}px; height: ${height}px;`}>
	{#if renderError}
		<div class="echarts-fallback">
			<p>Chart failed to render for <span class="echarts-name">{chartName}</span>.</p>
			<p class="echarts-error-message">{renderError}</p>
		</div>
	{:else}
		<SvelteECharts
			bind:chart={chartInstance}
			init={initWithTheme}
			notMerge={true}
			options={option}
			theme={themeName}
			onClick={handleClick}
			onMouseover={handleMouseOver}
			onMouseout={handleMouseOut}
			aria-label={`ECharts plot for ${chartName} with X axis ${xAxisLabel}`}
		></SvelteECharts>
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
