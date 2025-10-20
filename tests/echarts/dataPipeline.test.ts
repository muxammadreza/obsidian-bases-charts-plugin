import '../happydom';

import { describe, expect, test } from 'bun:test';

import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import { buildCartesianPipeline, attachDatasetsToSeries } from 'packages/obsidian/src/echarts/dataPipeline';

function createDataWrapper(points: ProcessedData[]): DataWrapper {
	const groupNames = ['Alpha', 'Beta'];
	const colors = ['#0044ff', '#cc5500'];

	return {
		getFlat: () => points,
		getChartName: () => 'Sample Chart',
		getGroupName: (groupIndex: number) => groupNames[groupIndex] ?? `Group ${groupIndex + 1}`,
		getGroupIdentifiers: () => groupNames,
		getChartIdentifiers: () => ['value'],
		getColorFromGroupIndex: (groupIndex: number) => colors[groupIndex] ?? '#999999',
		getYDomainForChart: () => [0, 100],
		getYDomain: () => ({ min: null, max: null, synced: false }),
		hasMultipleGroups: () => true,
		hasMultipleCharts: () => false,
		getChartGroupIdentifier: () => (() => colors[0]),
		getStacked: () => points,
		getGlobalYMin: () => 0,
		getGlobalYMax: () => 100,
		getChartYMin: () => 0,
		getChartYMax: () => 100,
		getGroupByDisplayName: () => '',
		view: {} as never,
		data: points,
		groupBySet: [],
		yDomain: { min: null, max: null, synced: false },
	} as unknown as DataWrapper;
}

describe('echarts data pipeline', () => {
	test('buildCartesianPipeline normalizes points and creates datasets', () => {
		const wrapper = createDataWrapper([
			{ x: 1, y: 10, file: 'a.md', groupIndex: 0, chartIndex: 0, label: 'A' },
			{ x: 1, y: 5, file: 'b.md', groupIndex: 1, chartIndex: 0, label: 'B' },
			{ x: 2, y: 8, file: 'c.md', groupIndex: 0, chartIndex: 0, label: 'C' },
		]);

		const pipeline = buildCartesianPipeline(wrapper, 0);
		expect(pipeline.axisType).toBe('value');
		expect(pipeline.seriesBlueprints).toHaveLength(2);
		expect(pipeline.seriesBlueprints[0]?.data).toHaveLength(2);
		expect(pipeline.validationErrors).toHaveLength(0);

		const datasets = attachDatasetsToSeries(pipeline.seriesBlueprints, pipeline.axisType, 0);
		expect(datasets).toHaveLength(2);
		expect(pipeline.seriesBlueprints[0]?.datasetId).toBeDefined();

		const firstRow = datasets[0]?.source[0] as { __datum?: unknown } | undefined;
		expect(firstRow?.__datum).toEqual(pipeline.seriesBlueprints[0]?.data[0]);
	});

	test('buildCartesianPipeline flags invalid numeric values', () => {
		const wrapper = createDataWrapper([
			{ x: 'Jan', y: Number.NaN, file: 'bad.md', groupIndex: 0, chartIndex: 0 },
			{ x: 'Feb', y: 12, file: 'good.md', groupIndex: 0, chartIndex: 0 },
		]);

		const pipeline = buildCartesianPipeline(wrapper, 0);
		expect(pipeline.validationErrors.length).toBeGreaterThan(0);
		expect(pipeline.seriesBlueprints[0]?.data).toHaveLength(1);
	});
});
