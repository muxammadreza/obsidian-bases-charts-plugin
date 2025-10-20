import '../happydom';
import '../obsidianMock';

import { describe, expect, test, mock } from 'bun:test';

mock.module('packages/obsidian/src/ChartView', () => {
	const MultiChartMode = {
		GROUP: 'Separate by group',
		PROPERTY: 'Separate by property',
	} as const;

	const CHART_SETTINGS = {
		X: 'x',
		SHOW_PERCENTAGES: 'show-percentages',
		SHOW_LABELS: 'show-labels',
		MULTI_CHART: 'multi-chart-mode',
		SYNC_Y_AXES: 'sync-y-axes',
		MIN_Y_OVERRIDE: 'min-y-override',
		MAX_Y_OVERRIDE: 'max-y-override',
		LABEL_PROP: 'label-property',
		CONFIG_STACK_STATE: 'config-stack-state',
	} as const;

	class ChartView {}

	return {
		CHART_SETTINGS,
		MultiChartMode,
		ChartView,
	};
});

const { GroupSeparatedData } = await import('packages/obsidian/src/ChartData');
const { buildBarOptions } = await import('packages/obsidian/src/echarts/options');
const { buildChartConfig } = await import('packages/obsidian/src/echarts/config');
const { createDefaultConfigStackState } = await import('packages/obsidian/src/charts/config-stack/state');
const { applyStackStateToOption } = await import('packages/obsidian/src/charts/config-stack/optionTransforms');
const { CHART_SETTINGS, MultiChartMode } = await import('packages/obsidian/src/ChartView');

type ChartViewStub = import('packages/obsidian/src/ChartView').ChartView;

type ViewStubOptions = {
	configValues?: Record<string, unknown>;
	yDomain?: { min: number | null; max: number | null; synced: boolean };
	properties?: string[];
	displayNames?: Record<string, string>;
};

function createViewStub(options: ViewStubOptions = {}): ChartViewStub {
	const properties = options.properties ?? ['propY'];
	const displayNames = options.displayNames ?? { propY: 'Value' };
	const configValues: Record<string, unknown> = {
		[CHART_SETTINGS.MULTI_CHART]: MultiChartMode.PROPERTY,
		[CHART_SETTINGS.SHOW_LABELS]: true,
		[CHART_SETTINGS.SHOW_PERCENTAGES]: false,
		...options.configValues,
	};

	const view = {
		config: {
			get: (key: string) => configValues[key],
			getAsPropertyId: (key: string) => (key === CHART_SETTINGS.X ? properties[0] : null),
			getDisplayName: (id: string) => displayNames[id] ?? id,
			getOrder: () => properties,
		},
		data: {
			properties,
		},
		getYDomainOverrides: () => options.yDomain ?? { min: null, max: null, synced: false },
	} as unknown as ChartViewStub;

	return view;
}

function readYValue(row: unknown): number {
	if (Array.isArray(row)) {
		const tuple = row as unknown[];
		const value = tuple[1];
		const numeric = Number(value);
		return Number.isFinite(numeric) ? numeric : 0;
	}
	if (row && typeof row === 'object') {
		const record = row as Record<string, unknown>;
		if (Array.isArray(record.value)) {
			const tuple = record.value as unknown[];
			const numeric = Number(tuple[1]);
			return Number.isFinite(numeric) ? numeric : 0;
		}
		if (typeof record.y === 'number') {
			return record.y;
		}
		if (record.y != null) {
			const numeric = Number(record.y);
			return Number.isFinite(numeric) ? numeric : 0;
		}
	}
	return 0;
}

describe('config stack smoke tests', () => {
	test('applies dataset sorting and sampling via stack state', () => {
		const view = createViewStub({
			properties: ['metric'],
			displayNames: { metric: 'Metric' },
		});
		const processed = [
			{ x: 'B', y: 90, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
			{ x: 'A', y: 10, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
			{ x: 'C', y: 40, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
		];
		const wrapper = new GroupSeparatedData(view, processed, ['Group 1']);
		const config = buildChartConfig(view, { chartType: 'bar' });
		const baseOption = buildBarOptions(wrapper, 0, config).option;

		const baseDataset = (baseOption.dataset as Array<{ source: unknown[] }>)[0];
		expect(baseDataset).toBeDefined();
		expect(baseDataset.source.map(readYValue)).toEqual([90, 10, 40]);

		const state = createDefaultConfigStackState(config);
		state.dataset.sortOrder = 'ascending';
		state.dataset.sampling = 'lttb';

		const mutated = applyStackStateToOption(baseOption, state);
		const mutatedDataset = (mutated.dataset as Array<{ source: unknown[] }>)[0];
		expect(mutatedDataset).toBeDefined();
		expect(mutatedDataset.source.map(readYValue)).toEqual([10, 40, 90]);

		const mutatedSeries = mutated.series as Array<Record<string, unknown>>;
		expect(mutatedSeries.length).toBeGreaterThan(0);
		for (const series of mutatedSeries) {
			expect(series.sampling).toBe('lttb');
		}

		// ensure the source option is not mutated
		expect(baseDataset.source.map(readYValue)).toEqual([90, 10, 40]);
	});

	test('applies option mutations for config stack state', () => {
		const view = createViewStub({
			properties: ['seriesA', 'seriesB'],
			displayNames: { seriesA: 'Series A', seriesB: 'Series B' },
		});
		const processed = [
			{ x: 1, y: 12, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
			{ x: 2, y: 24, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
			{ x: 1, y: 6, groupIndex: 1, chartIndex: 0, file: 'notes/b.md' },
			{ x: 2, y: 18, groupIndex: 1, chartIndex: 0, file: 'notes/b.md' },
		];
		const wrapper = new GroupSeparatedData(view, processed, ['Group A', 'Group B']);
		const config = buildChartConfig(view, { chartType: 'bar' });
		const baseOption = buildBarOptions(wrapper, 0, config).option;

		const baseTooltipFormatter = () => 'base';
		if (!baseOption.tooltip) {
			baseOption.tooltip = {};
		}
		baseOption.tooltip.formatter = baseTooltipFormatter;

		const state = createDefaultConfigStackState(config);
		state.axes.xType = 'value';
		state.axes.invertX = true;
		state.axes.yMin = 5;
		state.axes.yMax = 50;

		state.series.showLabels = false;
		state.series.stackSeries = true;
		state.series.showPercentages = true;
		state.series.smoothLines = true;
		state.series.symbolSize = 18;
		state.series.animation = false;

		state.legend.visible = false;
		state.legend.position = 'right';
		state.legend.orient = 'vertical';

		state.tooltip.trigger = 'axis';
		state.tooltip.shared = true;

		state.interactions.brushEnabled = true;
		state.interactions.dataZoomEnabled = true;
		state.interactions.hoverLink = false;

		state.theming.themeId = 'dark';
		state.theming.accentColor = '#ff33aa';

		const mutated = applyStackStateToOption(baseOption, state);
		const xAxis = Array.isArray(mutated.xAxis) ? mutated.xAxis[0] : mutated.xAxis;
		const yAxis = Array.isArray(mutated.yAxis) ? mutated.yAxis[0] : mutated.yAxis;

		expect(xAxis).toMatchObject({ inverse: true, type: 'value' });
		expect(yAxis).toMatchObject({ min: 5, max: 50 });
		expect((yAxis?.splitLine as Record<string, unknown> | undefined)?.show).toBe(true);

		const mutatedSeries = mutated.series as Array<Record<string, any>>;
		expect(mutatedSeries.length).toBeGreaterThan(0);
		const firstSeries = mutatedSeries[0];
		expect(firstSeries?.label?.show).toBe(false);
		expect(firstSeries?.stack).toBe('bases-stack');
		expect(typeof firstSeries?.tooltip?.valueFormatter).toBe('function');
		expect(firstSeries?.smooth).toBe(true);
		expect(firstSeries?.animation).toBe(false);
		expect(firstSeries?.symbolSize).toBe(18);
		expect(firstSeries?.hoverLink).toBe(false);

		const legend = mutated.legend as Record<string, unknown>;
		expect(legend.show).toBe(false);
		expect(legend.orient).toBe('vertical');
		expect(legend.right).toBe(8);
		expect(legend.left).toBeUndefined();

		const tooltip = mutated.tooltip as Record<string, unknown>;
		expect(tooltip.trigger).toBe('axis');
		expect(tooltip.axisPointer).toBeDefined();
		expect(tooltip.formatter).toBe(baseTooltipFormatter);

		expect(mutated.brush).toBeDefined();
		expect(Array.isArray(mutated.dataZoom)).toBe(true);
		expect(mutated.backgroundColor).toBe('#131313');
		expect(Array.isArray(mutated.color)).toBe(true);
		expect((mutated.color as string[])[0]).toBe('#ff33aa');

		const originalSeries = baseOption.series as Array<Record<string, any>>;
		expect(originalSeries[0]?.stack).toBeUndefined();
		expect(originalSeries[0]?.tooltip?.valueFormatter).toBeUndefined();
		expect(baseOption.brush).toBeUndefined();
		expect(baseOption.dataZoom).toBeUndefined();
		expect(baseOption.backgroundColor).not.toBe('#131313');
	});
});
