import type { DataWrapper, EChartsDataPoint, LegendMetadata } from 'packages/obsidian/src/ChartData';
import { collectLegendMetadata, toEChartsDataPoints } from 'packages/obsidian/src/ChartData';
import type { MultiChartMode } from 'packages/obsidian/src/ChartView';
import { toCompactString } from 'packages/obsidian/src/utils/utils';

export type AxisType = 'value' | 'category' | 'time';

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

export interface EChartsDatum {
	value: [number | string, number];
	rawX: number | string | Date;
	xKey: string;
	file: string;
	label?: string;
	groupIndex: number;
	chartIndex: number;
}

export type LegendEntry = LegendMetadata;

export interface ChartOptionResult {
	option: EChartsOption;
	legendEntries: LegendEntry[];
	overrideErrors: string[];
	overrideParseErrors: string[];
}

export interface ChartConfigState {
	xAxisLabel: string;
	yAxisLabelBase?: string;
	multiChartMode: MultiChartMode;
	yDomain?: [number | null, number | null];
	showLabels?: boolean;
	showPercentages?: boolean;
	overrides?: Record<string, unknown> | null;
	overrideParseErrors?: string[];
	tooltipFormatter?: (datum: EChartsDatum, seriesName: string) => string;
	labelFormatter?: (datum: EChartsDatum, seriesName: string) => string;
}

const ALLOWED_ROOT_OVERRIDE_KEYS = new Set([
	'grid',
	'legend',
	'tooltip',
	'xAxis',
	'yAxis',
	'color',
	'series',
	'visualMap',
	'axisPointer',
	'title',
	'dataZoom',
	'toolbox',
	'textStyle',
	'backgroundColor',
]);

const PROTECTED_SERIES_KEYS = new Set(['data', 'type', 'encode', 'datasetIndex', 'id', 'name']);
const PROTECTED_AXIS_KEYS = new Set(['data']);

interface SeriesBlueprint {
	groupIndex: number;
	name: string;
	color: string;
	data: EChartsDatum[];
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
	legendEntries: LegendEntry[];
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
	const rawPoints = toEChartsDataPoints(data, chartIndex);
	const axisType = detectAxisType(rawPoints);
	const processedPoints = rawPoints.map(point => toEChartsDatum(point, axisType));
	const legendEntries = collectLegendMetadata(data);
	const seriesBlueprints = buildSeriesBlueprints(legendEntries, processedPoints);
	const hasMultipleSeries = seriesBlueprints.filter(series => series.data.length > 0).length > 1;

	const ctx: CartesianBuildContext = {
		chartType: options.chartType,
		data,
		chartIndex,
		config,
		axisType,
		processedPoints,
		seriesBlueprints,
		hasMultipleSeries,
		legendEntries,
	};

	options.onBeforeSeriesCreate?.(ctx);

	const baseOption = createBaseOption(ctx);

	const series = seriesBlueprints.map(blueprint => {
		const optionSeries: Record<string, unknown> = {
			type: options.chartType,
			name: blueprint.name,
			data: blueprint.data.map(datum => ({ ...datum, value: [datum.value[0], datum.value[1]] })),
			itemStyle: { color: blueprint.color },
		};

		if (options.chartType === 'line') {
			optionSeries.symbol = optionSeries.symbol ?? 'circle';
		}

		options.decorateSeries?.(optionSeries, ctx, blueprint);
		return optionSeries;
	});

	baseOption.series = series;
	options.onOptionFinalize?.(baseOption, ctx);

	const { option, errors } = mergeEChartsOverrides(baseOption, config.overrides);

	return {
		option,
		legendEntries,
		overrideErrors: errors,
		overrideParseErrors: config.overrideParseErrors ?? [],
	};
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
		hasString = true;
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

function buildSeriesBlueprints(legendEntries: LegendEntry[], processedPoints: EChartsDatum[]): SeriesBlueprint[] {
	const blueprints = legendEntries.map(entry => ({
		groupIndex: entry.groupIndex,
		name: entry.label,
		color: entry.color,
		data: [] as EChartsDatum[],
	}));

	for (const datum of processedPoints) {
		const blueprint = blueprints[datum.groupIndex];
		if (blueprint) {
			blueprint.data.push(datum);
		}
	}

	return blueprints;
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
			const typed = params as { seriesName?: string; data?: EChartsDatum; value?: [number | string, number] };
			const datum = typed.data;
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
	const typed = params as { data?: EChartsDatum; seriesName?: string; value?: [number | string, number] };
	const datum = typed.data;
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

export function mergeEChartsOverrides(baseOption: EChartsOption, overrides: Record<string, unknown> | null | undefined): MergeOverrideResult {
	const merged = deepClone(baseOption);
	const errors: string[] = [];

	if (!overrides) {
		return { option: merged, errors };
	}

	if (!isPlainObject(overrides)) {
		errors.push('Advanced overrides must be a plain object.');
		return { option: merged, errors };
	}

	for (const [key, value] of Object.entries(overrides)) {
		if (!ALLOWED_ROOT_OVERRIDE_KEYS.has(key)) {
			errors.push(`Override key "${key}" is not allowed.`);
			continue;
		}
		if (key === 'series') {
			handleSeriesOverride(merged, value, errors);
			continue;
		}
		if (key === 'xAxis' || key === 'yAxis') {
			handleAxisOverride(merged, key, value, errors);
			continue;
		}
		mergeValue(merged, key, value);
	}

	return { option: merged, errors };
}

function handleSeriesOverride(option: EChartsOption, value: unknown, errors: string[]): void {
	if (!Array.isArray(value)) {
		errors.push('`series` override must be an array.');
		return;
	}
	const targetSeries: Record<string, unknown>[] = Array.isArray(option.series) ? option.series : [];

	for (let index = 0; index < value.length; index++) {
		const entry: unknown = value[index];
		if (!isPlainObject(entry)) {
			errors.push(`series[${index}] override must be a plain object.`);
			continue;
		}
		const target = targetSeries[index];
		if (!target) {
			errors.push(`Cannot override series[${index}] because it does not exist.`);
			continue;
		}
		for (const [prop, propValue] of Object.entries(entry)) {
			if (PROTECTED_SERIES_KEYS.has(prop)) {
				errors.push(`Overriding series[${index}].${prop} is not permitted.`);
				continue;
			}
			mergeValue(target, prop, propValue);
		}
	}
}

function handleAxisOverride(option: EChartsOption, key: 'xAxis' | 'yAxis', value: unknown, errors: string[]): void {
	const currentAxis = key === 'xAxis' ? option.xAxis : option.yAxis;
	const axisList: AxisConfig[] = Array.isArray(currentAxis) ? currentAxis : currentAxis ? [currentAxis] : [];
	const overrideList: unknown[] = Array.isArray(value) ? value : [value];

	for (let index = 0; index < overrideList.length; index++) {
		const overrideEntry = overrideList[index];
		if (!isPlainObject(overrideEntry)) {
			errors.push(`${key}[${index}] override must be a plain object.`);
			continue;
		}
		const target = axisList[index];
		if (!target) {
			errors.push(`Cannot override ${key}[${index}] because it does not exist.`);
			continue;
		}
		for (const [prop, propValue] of Object.entries(overrideEntry)) {
			if (PROTECTED_AXIS_KEYS.has(prop)) {
				errors.push(`Overriding ${key}[${index}].${prop} is not permitted.`);
				continue;
			}
			mergeValue(target, prop, propValue);
		}
	}

	if (Array.isArray(currentAxis)) {
		if (key === 'xAxis') {
			option.xAxis = axisList;
		} else {
			option.yAxis = axisList;
		}
	} else if (axisList[0]) {
		if (key === 'xAxis') {
			option.xAxis = axisList[0];
		} else {
			option.yAxis = axisList[0];
		}
	}
}

function mergeValue(target: Record<string, unknown>, key: string, value: unknown): void {
	const existing = target[key];
	if (isPlainObject(existing) && isPlainObject(value)) {
		const merged: Record<string, unknown> = { ...existing };
		for (const [childKey, childValue] of Object.entries(value)) {
			mergeValue(merged, childKey, childValue);
		}
		target[key] = merged;
		return;
	}
	if (isUnknownArray(existing) && isUnknownArray(value)) {
		const clonedArray = value.map(entry => (isPlainObject(entry) ? deepClone(entry) : entry));
		target[key] = clonedArray;
		return;
	}
	target[key] = deepClone(value);
}

function deepClone<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		try {
			return structuredClone(value);
		} catch {
			// structuredClone cannot handle functions; fall through to manual clone.
		}
	}
	return cloneShallow(value) as T;
}

function cloneShallow(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(item => cloneShallow(item));
	}
	if (isPlainObject(value)) {
		const clone: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			clone[key] = cloneShallow(child);
		}
		return clone;
	}
	return value;
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

function isUnknownArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value == null) {
		return false;
	}
	if (typeof value !== 'object') {
		return false;
	}
	return Object.getPrototypeOf(value) === Object.prototype;
}
