import type { DataWrapper, LegendMetadata } from 'packages/obsidian/src/ChartData';
import type { MultiChartMode } from 'packages/obsidian/src/ChartView';
import { toCompactString } from 'packages/obsidian/src/utils/utils';
import {
	attachDatasetsToSeries,
	buildCartesianPipeline,
	type AxisType,
	type EChartsDatum,
	type SeriesBlueprint,
} from 'packages/obsidian/src/echarts/dataPipeline';

interface AxisLabelConfig {
	formatter?: (value: number | string) => string;
}

interface AxisConfig extends Record<string, unknown> {
	axisLabel?: AxisLabelConfig;
	splitLine?: Record<string, unknown>;
}

export interface EChartsOption {
	[key: string]: unknown;
	color?: string[];
	series?: Record<string, unknown>[];
	xAxis?: AxisConfig | AxisConfig[];
	yAxis?: AxisConfig | AxisConfig[];
	legend?: Record<string, unknown>;
	tooltip?: Record<string, unknown>;
	grid?: Record<string, unknown>;
}

export interface ChartOptionResult {
	option: EChartsOption;
	legendEntries: LegendMetadata[];
	errors: string[];
}

export interface ChartConfigState {
	xAxisLabel: string;
	yAxisLabelBase?: string;
	multiChartMode: MultiChartMode;
	yDomain?: [number | null, number | null];
	showLabels?: boolean;
	showPercentages?: boolean;
	tooltipFormatter?: (datum: EChartsDatum, seriesName: string) => string;
	labelFormatter?: (datum: EChartsDatum, seriesName: string) => string;
}

interface CartesianBuildContext {
	chartType: 'scatter' | 'line' | 'bar';
	data: DataWrapper;
	chartIndex: number;
	config: ChartConfigState;
	axisType: AxisType;
	processedPoints: EChartsDatum[];
	seriesBlueprints: SeriesBlueprint[];
	hasMultipleSeries: boolean;
	legendEntries: LegendMetadata[];
	datasets: Record<string, unknown>[] | null;
	validationErrors: string[];
}

interface CartesianBuildOptions {
	chartType: 'scatter' | 'line' | 'bar';
	data: DataWrapper;
	chartIndex: number;
	config: ChartConfigState;
	onBeforeSeriesCreate?: (ctx: CartesianBuildContext) => void;
	decorateSeries?: (series: Record<string, unknown>, ctx: CartesianBuildContext, blueprint: SeriesBlueprint) => void;
	onOptionFinalize?: (option: EChartsOption, ctx: CartesianBuildContext) => void;
}

export interface MergeOverrideResult {
	option: EChartsOption;
	errors: string[];
}

export function buildScatterOptions(data: DataWrapper, chartIndex: number, config: ChartConfigState): ChartOptionResult {
	return buildCartesianOptions({
		chartType: 'scatter',
		data,
		chartIndex,
		config,
		decorateSeries: (series: Record<string, unknown>): void => {
			series.symbolSize ??= 10;
			series.emphasis ??= { focus: 'series' };
		},
	});
}

export function buildLineOptions(data: DataWrapper, chartIndex: number, config: ChartConfigState): ChartOptionResult {
	return buildCartesianOptions({
		chartType: 'line',
		data,
		chartIndex,
		config,
		decorateSeries: (series: Record<string, unknown>): void => {
			series.showSymbol ??= true;
			series.emphasis ??= { focus: 'series' };
		},
	});
}

export function buildBarOptions(data: DataWrapper, chartIndex: number, config: ChartConfigState): ChartOptionResult {
	return buildCartesianOptions({
		chartType: 'bar',
		data,
		chartIndex,
		config,
		onBeforeSeriesCreate: (ctx: CartesianBuildContext): void => {
			if (config.showPercentages) {
				convertSeriesToPercentages(ctx.seriesBlueprints);
			}
		},
		decorateSeries: (series: Record<string, unknown>, ctx: CartesianBuildContext): void => {
			if (config.showPercentages && ctx.hasMultipleSeries) {
				series.stack = 'total';
			}
			const showLabels = config.showLabels ?? true;
			if (showLabels) {
				series.label = {
					show: true,
					position: config.showPercentages ? 'insideTop' : 'top',
					formatter: (params: unknown): string => formatLabel(params, config),
				};
			}
			series.emphasis ??= { focus: 'series' };
		},
		onOptionFinalize: (option: EChartsOption, ctx: CartesianBuildContext): void => {
			const axis = getFirstAxis(option.yAxis);
			if (!axis) {
				return;
			}

			const axisLabel = ensureAxisLabel(axis);
			if (config.showPercentages) {
				axisLabel.formatter = (value: number | string): string => {
					const numeric = Number(value);
					return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : `${value}%`;
				};
			} else {
				axisLabel.formatter ??= (value: number | string): string => {
					const numeric = typeof value === 'number' ? value : Number(value);
					return toCompactString(Number.isFinite(numeric) ? numeric : value);
				};
			}
			if (ctx.seriesBlueprints.some(series => series.data.length > 0)) {
				axis.splitLine = axis.splitLine ?? { show: true };
			}
		},
	});
}

function buildCartesianOptions(options: CartesianBuildOptions): ChartOptionResult {
	const { data, chartIndex, config } = options;
	const pipeline = buildCartesianPipeline(data, chartIndex);
	const hasMultipleSeries = pipeline.seriesBlueprints.filter(series => series.data.length > 0).length > 1;

	const ctx: CartesianBuildContext = {
		chartType: options.chartType,
		data,
		chartIndex,
		config,
		axisType: pipeline.axisType,
		processedPoints: pipeline.processedPoints,
		seriesBlueprints: pipeline.seriesBlueprints,
		hasMultipleSeries,
		legendEntries: pipeline.legendEntries,
		datasets: null,
		validationErrors: pipeline.validationErrors,
	};

	options.onBeforeSeriesCreate?.(ctx);

	const baseOption = createBaseOption(ctx);

	const datasets = attachDatasetsToSeries(ctx.seriesBlueprints, ctx.axisType, chartIndex).map(dataset => ({
		id: dataset.id,
		dimensions: dataset.dimensions,
		source: dataset.source,
	}));
	ctx.datasets = datasets.length > 0 ? datasets : null;

	const series = ctx.seriesBlueprints.map(blueprint => {
		const optionSeries: Record<string, unknown> = {
			type: options.chartType,
			name: blueprint.name,
			itemStyle: { color: blueprint.color },
			data: blueprint.data.map(datum => ({ ...datum, value: [datum.value[0], datum.value[1]] })),
		};

		if (blueprint.datasetId) {
			optionSeries.datasetId = blueprint.datasetId;
			optionSeries.encode = { x: 'x', y: 'y' };
		}

		if (options.chartType === 'line') {
			optionSeries.symbol = optionSeries.symbol ?? 'circle';
		}

		options.decorateSeries?.(optionSeries, ctx, blueprint);
		return optionSeries;
	});

	baseOption.series = series;
	if (ctx.datasets) {
		baseOption.dataset = ctx.datasets;
	}
	options.onOptionFinalize?.(baseOption, ctx);

	const errors = ctx.validationErrors ?? [];

	return {
		option: baseOption,
		legendEntries: ctx.legendEntries,
		errors,
	};
}

function createBaseOption(ctx: CartesianBuildContext): EChartsOption {
	const chartName = ctx.data.getChartName(ctx.chartIndex);
	const xAxis = buildXAxisConfig(ctx.axisType, ctx.config.xAxisLabel, ctx.processedPoints);
	const [yMin, yMax] = resolveYDomain(ctx);
	const yAxisLabel = ctx.config.yAxisLabelBase ? `${ctx.config.yAxisLabelBase} ${chartName}` : `↑ ${chartName}`;

	return {
		color: ctx.legendEntries.map(entry => entry.color),
		legend: {
			data: ctx.legendEntries.map(entry => entry.label),
		},
		tooltip: buildTooltip(ctx),
		grid: {
			left: 48,
			right: 24,
			top: 24,
			bottom: 48,
			containLabel: true,
		},
		xAxis,
		yAxis: {
			type: 'value',
			name: yAxisLabel,
			nameLocation: 'middle',
			nameGap: 40,
			min: yMin ?? undefined,
			max: yMax ?? undefined,
		},
	};
}

function buildTooltip(ctx: CartesianBuildContext): Record<string, unknown> {
	return {
		trigger: 'item',
		formatter: (params: unknown): string => {
			const typed = params as { seriesName?: string; data?: unknown; value?: [number | string, number] };
			const datum = coerceDatumFromEventPayload(typed);
			if (!datum) {
				return typed.seriesName ?? '';
			}

			if (ctx.config.tooltipFormatter) {
				return ctx.config.tooltipFormatter(datum, typed.seriesName ?? '');
			}

			const seriesColor = ctx.legendEntries.find(entry => entry.label === typed.seriesName)?.color;
			const xDisplay = datum.rawX instanceof Date ? datum.rawX.toLocaleString() : datum.rawX;
			const yDisplay = toCompactString(datum.value[1]);
			const colorSwatch = seriesColor
				? `<span style="display:inline-block;margin-right:8px;width:10px;height:10px;border-radius:50%;background:${seriesColor}"></span>`
				: '';
			const labelLine = datum.label ? `<br/>Label: ${datum.label}` : '';
			return `${colorSwatch}${typed.seriesName ?? ''}<br/>X: ${xDisplay}<br/>Y: ${yDisplay}${labelLine}`;
		},
	};
}

function buildXAxisConfig(axisType: AxisType, label: string, points: EChartsDatum[]): AxisConfig {
	const axis: AxisConfig = {
		type: axisType,
		name: label,
		nameLocation: 'middle',
		nameGap: 30,
	};

	if (axisType === 'category') {
		axis.data = collectCategoryAxis(points);
	}
	if (axisType === 'time') {
		const axisLabel = ensureAxisLabel(axis);
		axisLabel.formatter = (value: number | string): string => formatTimeLabel(value);
	}

	return axis;
}

function collectCategoryAxis(points: EChartsDatum[]): (string | number)[] {
	const categories: (string | number)[] = [];
	const seen = new Set<string>();

	for (const point of points) {
		if (!seen.has(point.xKey)) {
			seen.add(point.xKey);
			const raw = point.rawX;
			categories.push(raw instanceof Date ? raw.toLocaleString() : raw);
		}
	}

	return categories;
}

function formatTimeLabel(value: number | string): string {
	if (typeof value === 'number') {
		return new Date(value).toLocaleString();
	}
	const numeric = Number(value);
	if (!Number.isNaN(numeric)) {
		return new Date(numeric).toLocaleString();
	}
	return value;
}

function resolveYDomain(ctx: CartesianBuildContext): [number | null, number | null] {
	if (ctx.config.yDomain) {
		return ctx.config.yDomain;
	}
	return ctx.data.getYDomainForChart(ctx.chartIndex);
}

function convertSeriesToPercentages(seriesBlueprints: SeriesBlueprint[]): void {
	const totals = new Map<string, number>();

	for (const series of seriesBlueprints) {
		for (const datum of series.data) {
			totals.set(datum.xKey, (totals.get(datum.xKey) ?? 0) + datum.value[1]);
		}
	}

	for (const series of seriesBlueprints) {
		series.data = series.data.map(datum => {
			const total = totals.get(datum.xKey) ?? 0;
			const nextY = total === 0 ? 0 : (datum.value[1] / total) * 100;
			return {
				...datum,
				value: [datum.value[0], Number.isFinite(nextY) ? nextY : 0],
			};
		});
	}
}

function formatLabel(params: unknown, config: ChartConfigState): string {
	const typed = params as { data?: unknown; seriesName?: string; value?: [number | string, number] };
	const datum = coerceDatumFromEventPayload(typed);
	if (datum && config.labelFormatter) {
		return config.labelFormatter(datum, typed.seriesName ?? '');
	}
	const value = datum?.value?.[1] ?? typed.value?.[1] ?? 0;
	if (config.showPercentages) {
		return `${value.toFixed(1)}%`;
	}
	return toCompactString(value);
}

function getFirstAxis(axisConfig: EChartsOption['yAxis']): AxisConfig | null {
	if (!axisConfig) {
		return null;
	}
	if (Array.isArray(axisConfig)) {
		return axisConfig[0] ?? null;
	}
	return axisConfig;
}

export function coerceDatumFromEventPayload(
	payload: { data?: unknown; value?: [number | string, number] } | undefined,
): EChartsDatum | undefined {
	if (!payload) {
		return undefined;
	}
	const fromData = coerceDatum(payload.data);
	if (fromData) {
		return fromData;
	}
	if (Array.isArray(payload.value)) {
		const valueTuple = payload.value as [number | string, number];
		return {
			value: valueTuple,
			rawX: valueTuple[0],
			xKey: String(valueTuple[0]),
			file: '',
			groupIndex: 0,
			chartIndex: 0,
		};
	}
	return undefined;
}

function coerceDatum(source: unknown): EChartsDatum | undefined {
	if (!source) {
		return undefined;
	}
	if (isEChartsDatum(source)) {
		return source;
	}
	if (typeof source === 'object') {
		const record = source as {
			__datum?: unknown;
			value?: unknown;
			rawX?: unknown;
			xKey?: unknown;
			file?: unknown;
			label?: unknown;
			groupIndex?: unknown;
			chartIndex?: unknown;
		};
		if (isEChartsDatum(record.__datum)) {
			return record.__datum;
		}
		if (Array.isArray(record.value)) {
			const tuple = record.value as [number | string, number];
			const rawXValue = isValidRawX(record.rawX) ? record.rawX : tuple[0];
			return {
				value: tuple,
				rawX: rawXValue,
				xKey: record.xKey ? String(record.xKey) : String(tuple[0]),
				file: record.file ? String(record.file) : '',
				label: record.label !== undefined ? (record.label as string | undefined) : undefined,
				groupIndex: record.groupIndex !== undefined ? Number(record.groupIndex) : 0,
				chartIndex: record.chartIndex !== undefined ? Number(record.chartIndex) : 0,
			};
		}
	}
	return undefined;
}

function isValidRawX(value: unknown): value is string | number | Date {
	if (value instanceof Date) {
		return true;
	}
	return typeof value === 'string' || typeof value === 'number';
}

function isEChartsDatum(value: unknown): value is EChartsDatum {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<EChartsDatum>;
	return (
		Array.isArray(candidate.value) &&
		candidate.value.length === 2 &&
		typeof candidate.xKey === 'string' &&
		typeof candidate.file === 'string' &&
		typeof candidate.groupIndex === 'number' &&
		typeof candidate.chartIndex === 'number'
	);
}

function ensureAxisLabel(target: AxisConfig): AxisLabelConfig {
	const existing = target.axisLabel;
	if (existing) {
		return existing;
	}
	const next: AxisLabelConfig = {};
	target.axisLabel = next;
	return next;
}
