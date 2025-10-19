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
		ECHARTS_OVERRIDES: 'echarts-options-override',
	} as const;

	class ChartView {}

	return {
		CHART_SETTINGS,
		MultiChartMode,
		ChartView,
	};
});
import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import type { ChartConfigState } from 'packages/obsidian/src/echarts/options';
import type { ChartKind } from 'packages/obsidian/src/echarts/config';
import type { ChartView, YDomainOverrides } from 'packages/obsidian/src/ChartView';

type OverrideState = { overrides: Record<string, unknown> | null; errors: string[] };

function createViewStub(
	options: {
		configValues?: Record<string, unknown>;
		yDomain?: YDomainOverrides;
		overrides?: OverrideState;
		properties?: string[];
		displayNames?: Record<string, string>;
	} = {},
): ChartView {
	const configValues: Record<string, unknown> = {
		[CHART_SETTINGS.MULTI_CHART]: MultiChartMode.PROPERTY,
		[CHART_SETTINGS.SHOW_LABELS]: true,
		[CHART_SETTINGS.SHOW_PERCENTAGES]: false,
		...options.configValues,
	};

	const properties = options.properties ?? ['propX'];

	const view = {
		config: {
			get: (key: string) => configValues[key],
			getAsPropertyId: (key: string) => (key === CHART_SETTINGS.X ? 'propX' : null),
			getDisplayName: (id: string) => options.displayNames?.[id] ?? id,
			getOrder: () => properties,
		},
		data: {
			properties,
		},
		getYDomainOverrides: () => options.yDomain ?? { min: null, max: null, synced: false },
		getAdvancedOverrides: () => options.overrides ?? { overrides: null, errors: [] },
	} as unknown as ChartView;

	return view;
}

describe('ChartData ECharts helpers', () => {
	test('toEChartsDataPoints emits series metadata', () => {
		const processed: ProcessedData[] = [
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

		const view = createViewStub({
			properties: ['propX', 'propY'],
			displayNames: { propX: 'Prop X', propY: 'Prop Y' },
		});
		const wrapper: DataWrapper = new GroupSeparatedData(view, processed, ['Group A', 'Group B']);

		const points = toEChartsDataPoints(wrapper, 0);
		expect(points).toHaveLength(2);
		expect(points[0]).toMatchObject({
			rawX: 1,
			y: 5,
			file: 'notes/a.md',
			seriesLabel: 'Prop X',
		});
		expect(points[1].seriesLabel).toBe('Prop Y');

		const legend = collectLegendMetadata(wrapper);
		expect(legend.map(l => l.label)).toEqual(['Prop X', 'Prop Y']);
	});
});

const { GroupSeparatedData, collectLegendMetadata, toEChartsDataPoints } = await import('packages/obsidian/src/ChartData');
const { buildBarOptions } = await import('packages/obsidian/src/echarts/options');
const { buildChartConfig } = await import('packages/obsidian/src/echarts/config');
const { CHART_SETTINGS, MultiChartMode } = await import('packages/obsidian/src/ChartView');
await import('../obsidianMock');

describe('buildChartConfig', () => {
	test('produces bar configuration with toggles and overrides', () => {
		const view = createViewStub({
			configValues: {
				[CHART_SETTINGS.SHOW_LABELS]: false,
				[CHART_SETTINGS.SHOW_PERCENTAGES]: true,
			},
			yDomain: { min: 0, max: 42, synced: true },
			overrides: { overrides: { tooltip: { confine: true } }, errors: [] },
			displayNames: { propX: 'Prop X' },
		});

		const chartType: ChartKind = 'bar';
		const config = buildChartConfig(view, { chartType });

		expect(config.xAxisLabel).toBe('Prop X →');
		expect(config.yAxisLabelBase).toBe('↑');
		expect(config.multiChartMode).toBe(MultiChartMode.PROPERTY);
		expect(config.yDomain).toEqual([0, 42]);
		expect(config.showLabels).toBe(false);
		expect(config.showPercentages).toBe(true);
		expect(config.overrides).toEqual({ tooltip: { confine: true } });
		expect(config.overrideParseErrors).toEqual([]);
	});

	test('falls back to default modes and surfaces parse errors', () => {
		const view = createViewStub({
			configValues: { [CHART_SETTINGS.MULTI_CHART]: 'invalid-mode' },
			overrides: { overrides: null, errors: ['Invalid JSON'] },
		});

		const config = buildChartConfig(view, { chartType: 'scatter' });
		expect(config.multiChartMode).toBe(MultiChartMode.PROPERTY);
		expect(config.overrideParseErrors).toEqual(['Invalid JSON']);
	});
});

describe('option builders', () => {
	test('propagates parse errors through ChartOptionResult', () => {
		const processed: ProcessedData[] = [
			{
				x: 1,
				y: 2,
				groupIndex: 0,
				chartIndex: 0,
				file: 'notes/a.md',
			},
		];
		const view = createViewStub();
		const wrapper: DataWrapper = new GroupSeparatedData(view, processed, ['Only Group']);

		const config: ChartConfigState = {
			xAxisLabel: 'Prop X →',
			yAxisLabelBase: '↑',
			multiChartMode: MultiChartMode.PROPERTY,
			yDomain: [null, null],
			showLabels: true,
			showPercentages: false,
			overrides: null,
			overrideParseErrors: ['Invalid JSON'],
		};

		const result = buildBarOptions(wrapper, 0, config);
		expect(result.legendEntries).toHaveLength(1);
		expect(result.overrideParseErrors).toEqual(['Invalid JSON']);
	});
});
