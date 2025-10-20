<script lang="ts">
	import type { ChartView } from '../ChartView';
	import type { EChartsDatum } from '../echarts/dataPipeline';
	import type { EChartsOption } from '../echarts/options';
	import ConfigStackHost from './config-stack/ConfigStackHost.svelte';
	import { cloneConfigStackState, createEmptyConfigStackState } from './config-stack/state';
	import { applyStackStateToOption, cloneOption } from './config-stack/optionTransforms';
	import type { ConfigStackApplyDetail, ConfigStackRevertDetail, ConfigStackState } from './config-stack/types';
	import EChartsPlot from './EChartsPlot.svelte';

	interface Props {
		view: ChartView;
		chartName: string;
		xAxisLabel: string;
		option: EChartsOption;
		errors?: string[];
		forceRender?: boolean;
		chartIdentifier: string;
		stackState?: ConfigStackState;
	}

	let { view, chartName, xAxisLabel, option, errors = [], forceRender = false, chartIdentifier, stackState: providedStackState }: Props = $props();

	let width = $state(0);
	let height = $state(0);
	let enoughSpace = $derived(forceRender || (width > 100 && height > 100));

	const computeInitialStackState = () => cloneConfigStackState(providedStackState ?? createEmptyConfigStackState());
	const initialBaselineStackState = computeInitialStackState();
	const initialActiveStackState = cloneConfigStackState(initialBaselineStackState);
	const initialBaseOption = cloneOption(option);
	const initialCurrentOption = applyStackStateToOption(initialBaseOption, initialActiveStackState);

	let baselineStackState = $state(initialBaselineStackState);
	let activeStackState = $state(initialActiveStackState);
	let isDirty = $state(false);

	let baseOption = $state(initialBaseOption);
	let currentOption = $state(initialCurrentOption);

	$effect(() => {
		baseOption = cloneOption(option);
	});

	$effect(() => {
		currentOption = applyStackStateToOption(baseOption, activeStackState);
	});

	$effect(() => {
		const nextBaseline = computeInitialStackState();
		baselineStackState = nextBaseline;
		if (!isDirty) {
			activeStackState = cloneConfigStackState(nextBaseline);
		}
	});

	function handlePointClick(datum: EChartsDatum, params: unknown): void {
		const native = (params as { event?: MouseEvent })?.event;
		const newTab = Boolean(native?.ctrlKey || native?.metaKey);
		void view.openFile(datum.file, newTab);
	}

	function handleRenderError(message: string): void {
		view.notifyError(message);
	}

	function handleConfigApply(event: CustomEvent<ConfigStackApplyDetail>): void {
		activeStackState = cloneConfigStackState(event.detail.state);
		isDirty = true;
		view.saveConfigStackState(event.detail.chartId, event.detail.state);
	}

	function handleConfigRevert(event: CustomEvent<ConfigStackRevertDetail>): void {
		baselineStackState = cloneConfigStackState(event.detail.state);
		activeStackState = cloneConfigStackState(event.detail.state);
		isDirty = false;
		view.saveConfigStackState(event.detail.chartId, event.detail.state);
	}

	function handleConfigChange(event: CustomEvent<ConfigStackState>): void {
		activeStackState = cloneConfigStackState(event.detail);
	}
</script>

<div class="bases-charts-plot-grid-item" bind:clientWidth={width} bind:clientHeight={height}>
	{#if enoughSpace}
		{#if errors.length > 0}
			<div class="bases-charts-option-errors" role="alert">
				{#each [...new Set(errors)] as message}
					<span class="bases-charts-option-chip">{message}</span>
				{/each}
			</div>
		{/if}
		<ConfigStackHost
			chartId={chartIdentifier}
			state={activeStackState}
			baseline={baselineStackState}
			on:applyConfig={handleConfigApply}
			on:revert={handleConfigRevert}
			on:change={handleConfigChange}
		></ConfigStackHost>
		<EChartsPlot
			option={currentOption}
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

	.bases-charts-option-errors {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-2-2);
		margin-bottom: var(--size-4-2);
	}

	.bases-charts-option-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--size-2-1);
		padding: var(--size-2-1) var(--size-2-3);
		border-radius: var(--radius-s);
		background-color: #d72c2c;
		color: #ffffff;
		font-size: var(--font-small);
	}

	.bases-charts-option-chip::before {
		content: '⚠';
		font-size: 0.9em;
	}
</style>
