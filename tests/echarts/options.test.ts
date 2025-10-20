import '../happydom';

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

await import('../obsidianMock');

const { GroupSeparatedData } = await import('packages/obsidian/src/ChartData');
const { buildScatterOptions, buildLineOptions, buildBarOptions } = await import('packages/obsidian/src/echarts/options');
const { buildChartConfig } = await import('packages/obsidian/src/echarts/config');
const { CHART_SETTINGS, MultiChartMode } = await import('packages/obsidian/src/ChartView');

function createViewStub(
	options: {
		configValues?: Record<string, unknown>;
		yDomain?: { min: number | null; max: number | null; synced: boolean };
		properties?: string[];
		displayNames?: Record<string, string>;
	} = {},
) {
	const properties = options.properties ?? ['propX'];
	const displayNames = options.displayNames ?? { propX: 'Prop X' };
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
	} as unknown as import('packages/obsidian/src/ChartView').ChartView;

	return view;
}

describe('ECharts option builders', () => {
	test('buildScatterOptions maps series data and legends', () => {
		const view = createViewStub({
			properties: ['propX', 'propY'],
			displayNames: { propX: 'Group A', propY: 'Group B' },
		});
		const processed = [
			{
				x: 1,
				y: 5,
				groupIndex: 0,
				chartIndex: 0,
				file: 'notes/a.md',
				label: 'Alpha',
			},
			{
				x: 2,
				y: 3,
				groupIndex: 1,
				chartIndex: 0,
				file: 'notes/b.md',
				label: 'Beta',
			},
		];

		const wrapper = new GroupSeparatedData(view, processed, ['Group A', 'Group B']);
		const config = buildChartConfig(view, { chartType: 'scatter' });
		const result = buildScatterOptions(wrapper, 0, config);

		expect(result.legendEntries.map(entry => entry.label)).toEqual(['Group A', 'Group B']);
		expect(result.option.series).toHaveLength(2);
		const firstPoint = (result.option.series![0] as { data: unknown[] }).data[0] as { value: [number, number] };
		expect(firstPoint.value).toEqual([1, 5]);
	});

	test('buildLineOptions respects axis domain overrides', () => {
		const view = createViewStub({
			yDomain: { min: 0, max: 10, synced: true },
			properties: ['propX'],
			displayNames: { propX: 'Prop X' },
		});
		const processed = [
			{ x: 1, y: 2, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
			{ x: 2, y: 8, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
		];
		const wrapper = new GroupSeparatedData(view, processed, ['Only']);
		const config = buildChartConfig(view, { chartType: 'line' });
		const result = buildLineOptions(wrapper, 0, config);

		expect(result.option.yAxis).toMatchObject({ min: 0, max: 10 });
	});

	test('buildBarOptions converts to percentages when enabled', () => {
		const view = createViewStub({
			configValues: {
				[CHART_SETTINGS.SHOW_PERCENTAGES]: true,
				[CHART_SETTINGS.SHOW_LABELS]: true,
			},
			properties: ['propX', 'propY'],
			displayNames: { propX: 'G1', propY: 'G2' },
		});
		const processed = [
			{ x: 'A', y: 30, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
			{ x: 'A', y: 70, groupIndex: 1, chartIndex: 0, file: 'notes/a.md' },
		];
		const wrapper = new GroupSeparatedData(view, processed, ['G1', 'G2']);
		const config = buildChartConfig(view, { chartType: 'bar' });
		const result = buildBarOptions(wrapper, 0, config);
		const series = result.option.series as Array<{ data: Array<{ value: [unknown, number] }> }>;
		const percentages = series.map(s => s.data[0].value[1]);
		expect(percentages).toEqual([30, 70]);
	});
});

describe('option builder validation errors', () => {
	test('returns pipeline errors for invalid numeric data', () => {
		const view = createViewStub();
		const processed = [
			{ x: 1, y: Number.NaN, groupIndex: 0, chartIndex: 0, file: 'notes/a.md' },
		];
		const wrapper = new GroupSeparatedData(view, processed, ['Only']);
		const config = buildChartConfig(view, { chartType: 'scatter' });
		const result = buildScatterOptions(wrapper, 0, config);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
