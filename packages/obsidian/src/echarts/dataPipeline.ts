import type { DataWrapper, EChartsDataPoint, LegendMetadata } from 'packages/obsidian/src/ChartData';
import { collectLegendMetadata, toEChartsDataPoints } from 'packages/obsidian/src/ChartData';

export type AxisType = 'value' | 'category' | 'time';

export interface EChartsDatum {
	value: [number | string, number];
	rawX: number | string | Date;
	xKey: string;
	file: string;
	label?: string;
	groupIndex: number;
	chartIndex: number;
}

export interface SeriesBlueprint {
	groupIndex: number;
	name: string;
	color: string;
	data: EChartsDatum[];
	datasetId?: string;
	datasetIndex?: number;
}

export interface PipelineDataset {
	id: string;
	dimensions: { name: string; type: 'ordinal' | 'number' | 'time' }[];
	source: Record<string, unknown>[];
}

export interface CartesianPipelineResult {
	axisType: AxisType;
	processedPoints: EChartsDatum[];
	legendEntries: LegendMetadata[];
	seriesBlueprints: SeriesBlueprint[];
	validationErrors: string[];
}

export function buildCartesianPipeline(data: DataWrapper, chartIndex: number): CartesianPipelineResult {
	const rawPoints = toEChartsDataPoints(data, chartIndex);
	const axisType = detectAxisType(rawPoints);
	const legendEntries = collectLegendMetadata(data);
	const seriesBlueprints = initializeSeriesBlueprints(legendEntries);
	const validationErrors: string[] = [];
	const processedPoints: EChartsDatum[] = [];

	for (const point of rawPoints) {
		const datum = toEChartsDatum(point, axisType);
		const numericY = datum.value[1];
		if (!Number.isFinite(numericY)) {
			validationErrors.push(`Data point for key "${datum.xKey}" has an invalid numeric value.`);
			continue;
		}
		const blueprint = seriesBlueprints[datum.groupIndex];
		if (!blueprint) {
			validationErrors.push(`Encountered unknown series group index "${datum.groupIndex}".`);
			continue;
		}
		blueprint.data.push(datum);
		processedPoints.push(datum);
	}

	return {
		axisType,
		processedPoints,
		legendEntries,
		seriesBlueprints,
		validationErrors,
	};
}

export function attachDatasetsToSeries(seriesBlueprints: SeriesBlueprint[], axisType: AxisType, chartIndex: number): PipelineDataset[] {
	const datasets: PipelineDataset[] = [];

	for (let index = 0; index < seriesBlueprints.length; index++) {
		const blueprint = seriesBlueprints[index];
		const datasetId = `bases-chart-${chartIndex}-series-${blueprint.groupIndex}`;
		const source = blueprint.data.map(createDatasetRow);
		const dimensions = createDimensions(axisType);

		blueprint.datasetId = datasetId;
		blueprint.datasetIndex = index;

		datasets.push({
			id: datasetId,
			dimensions,
			source,
		});
	}

	return datasets;
}

function detectAxisType(points: EChartsDataPoint[]): AxisType {
	let hasDate = false;
	let hasNumber = false;
	let hasString = false;

	for (const point of points) {
		const value = point.rawX;
		if (value instanceof Date) {
			hasDate = true;
			break;
		}
		if (typeof value === 'number') {
			hasNumber = true;
			continue;
		}
		if (typeof value === 'string') {
			hasString = true;
		}
	}

	if (hasDate) {
		return 'time';
	}
	if (hasNumber && !hasString) {
		return 'value';
	}
	return 'category';
}

function toEChartsDatum(point: EChartsDataPoint, axisType: AxisType): EChartsDatum {
	const rawX = point.rawX;
	let xValue: number | string;

	if (axisType === 'time') {
		if (rawX instanceof Date) {
			xValue = rawX.getTime();
		} else if (typeof rawX === 'number') {
			xValue = rawX;
		} else {
			const parsed = Date.parse(String(rawX));
			xValue = Number.isNaN(parsed) ? String(rawX) : parsed;
		}
	} else if (axisType === 'value') {
		if (typeof rawX === 'number') {
			xValue = rawX;
		} else {
			const numeric = Number(rawX);
			xValue = Number.isFinite(numeric) ? numeric : 0;
		}
	} else {
		xValue = typeof rawX === 'string' ? rawX : String(rawX);
	}

	return {
		value: [xValue, point.y],
		rawX,
		xKey: point.xKey,
		file: point.file,
		label: point.label,
		groupIndex: point.groupIndex,
		chartIndex: point.chartIndex,
	};
}

function initializeSeriesBlueprints(entries: LegendMetadata[]): SeriesBlueprint[] {
	return entries.map(entry => ({
		groupIndex: entry.groupIndex,
		name: entry.label,
		color: entry.color,
		data: [],
	}));
}

function createDatasetRow(datum: EChartsDatum): Record<string, unknown> {
	return {
		x: datum.value[0],
		y: datum.value[1],
		rawX: datum.rawX,
		label: datum.label ?? null,
		file: datum.file,
		xKey: datum.xKey,
		groupIndex: datum.groupIndex,
		chartIndex: datum.chartIndex,
		value: [datum.value[0], datum.value[1]],
		__datum: datum,
	};
}

function createDimensions(axisType: AxisType): { name: string; type: 'ordinal' | 'number' | 'time' }[] {
	return [
		{ name: 'x', type: axisType === 'time' ? 'time' : axisType === 'category' ? 'ordinal' : 'number' },
		{ name: 'y', type: 'number' },
		{ name: 'label', type: 'ordinal' },
		{ name: 'file', type: 'ordinal' },
		{ name: 'xKey', type: 'ordinal' },
	];
}
