import type { ConfigStackState } from 'packages/obsidian/src/charts/config-stack/types';
import type { EChartsOption } from 'packages/obsidian/src/echarts/options';

type MutableSeries = Record<string, unknown> & {
	label?: Record<string, unknown>;
	tooltip?: Record<string, unknown>;
	sampling?: string;
	stack?: string;
	smooth?: boolean;
	symbolSize?: number;
	animation?: boolean;
	hoverLink?: boolean;
};

type MutableDataset = Record<string, unknown> & { source?: unknown[] };

interface SplitLineConfig extends Record<string, unknown> {
	show?: boolean;
}

export function cloneOption<T>(option: T): T {
	if (typeof structuredClone === 'function') {
		try {
			return structuredClone(option);
		} catch (error) {
			if (isDataCloneError(error)) {
				return cloneWithFunctions(option);
			}
			throw error;
		}
	}
	return cloneWithFunctions(option);
}

function isDataCloneError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}
	if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
		return error.name === 'DataCloneError';
	}
	return 'name' in error && (error as { name?: string }).name === 'DataCloneError';
}

function cloneWithFunctions<T>(value: T): T {
	if (value === null || typeof value !== 'object') {
		return value;
	}
	if (typeof value === 'function') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(entry => cloneWithFunctions(entry)) as unknown as T;
	}
	if (value instanceof Date) {
		return new Date(value.getTime()) as unknown as T;
	}
	if (value instanceof Map) {
		return new Map(value) as unknown as T;
	}
	if (value instanceof Set) {
		return new Set(value) as unknown as T;
	}
	const source = value as Record<string, unknown>;
	const clone: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(source)) {
		if (typeof entry === 'function') {
			clone[key] = entry;
			continue;
		}
		clone[key] = cloneWithFunctions(entry);
	}
	return clone as T;
}

export function applyStackStateToOption(option: EChartsOption, state: ConfigStackState): EChartsOption {
	const next = cloneOption(option ?? {});
	applyAxes(next, state);
	applySeries(next, state);
	applyLegend(next, state);
	applyTooltip(next, state);
	applyDataset(next, state);
	applyInteractions(next, state);
	applyTheming(next, state);
	return next;
}

function applyAxes(option: EChartsOption, state: ConfigStackState): void {
	const xAxis = ensureAxis(option, 'xAxis');
	const yAxis = ensureAxis(option, 'yAxis');

	xAxis.inverse = state.axes.invertX || undefined;
	xAxis.type = state.axes.xType === 'auto' ? undefined : state.axes.xType;
	yAxis.min = state.axes.yMin ?? undefined;
	yAxis.max = state.axes.yMax ?? undefined;

	const splitLine = ensureSplitLine(yAxis);
	splitLine.show = state.axes.showGridLines;
}

function applySeries(option: EChartsOption, state: ConfigStackState): void {
	const seriesArray = normalizeSeries(option);

	for (const series of seriesArray) {
		const nextLabel = { ...(series.label ?? {}) } as Record<string, unknown>;
		nextLabel.show = state.series.showLabels;
		series.label = nextLabel;

		series.animation = state.series.animation;
		series.smooth = state.series.smoothLines;
		series.symbolSize = state.series.symbolSize;

		if (state.series.stackSeries) {
			const existing = typeof series.stack === 'string' ? series.stack : undefined;
			series.stack = existing ?? 'bases-stack';
		} else {
			delete series.stack;
		}

		const tooltip = { ...(series.tooltip ?? {}) } as Record<string, unknown>;
		if (state.series.showPercentages) {
			tooltip.valueFormatter = (value: unknown): string => {
				const numeric = normalizeNumeric(value);
				return `${numeric.toFixed(1)}%`;
			};
			series.tooltip = tooltip;
		} else if ('valueFormatter' in tooltip) {
			delete tooltip.valueFormatter;
			series.tooltip = tooltip;
		}

		if (state.interactions.hoverLink) {
			delete series.hoverLink;
		} else {
			series.hoverLink = false;
		}
		if (state.dataset.sampling === 'auto') {
			delete series.sampling;
		} else {
			series.sampling = state.dataset.sampling;
		}
	}
}

function applyLegend(option: EChartsOption, state: ConfigStackState): void {
	const legend = (option.legend ??= {} as Record<string, unknown>);
	legend.show = state.legend.visible;
	legend.orient = state.legend.orient;
	delete legend.top;
	delete legend.right;
	delete legend.bottom;
	delete legend.left;

	switch (state.legend.position) {
		case 'top':
			legend.top = 8;
			break;
		case 'right':
			legend.right = 8;
			break;
		case 'bottom':
			legend.bottom = 8;
			break;
		case 'left':
			legend.left = 8;
			break;
	}
}

function applyTooltip(option: EChartsOption, state: ConfigStackState): void {
	const tooltip = (option.tooltip ??= {} as Record<string, unknown>);
	tooltip.show = state.tooltip.show;
	tooltip.trigger = state.tooltip.trigger;

	if (state.tooltip.shared) {
		tooltip.axisPointer = tooltip.axisPointer ?? { type: 'shadow' };
	} else if ('axisPointer' in tooltip) {
		delete tooltip.axisPointer;
	}
}

function applyDataset(option: EChartsOption, state: ConfigStackState): void {
	const datasets = normalizeDatasets(option);

	if (state.dataset.sortOrder !== 'none') {
		for (const dataset of datasets) {
			const source = dataset.source;
			if (!Array.isArray(source)) {
				continue;
			}
			const comparator = createDatasetComparator(state.dataset.sortOrder);
			source.sort((a, b) => comparator(extractYValue(a), extractYValue(b)));
		}
	}
}

function applyInteractions(option: EChartsOption, state: ConfigStackState): void {
	if (state.interactions.brushEnabled) {
		option.brush = option.brush ?? { toolbox: ['rect', 'polygon', 'clear'] };
	} else if (option.brush) {
		delete option.brush;
	}

	if (state.interactions.dataZoomEnabled) {
		if (!Array.isArray(option.dataZoom)) {
			option.dataZoom = [
				{
					type: 'slider',
					show: true,
					height: 14,
				},
			];
		}
	} else if (option.dataZoom) {
		delete option.dataZoom;
	}
}

function applyTheming(option: EChartsOption, state: ConfigStackState): void {
	if (state.theming.themeId === 'auto') {
		delete option.backgroundColor;
	} else if (state.theming.themeId === 'dark') {
		option.backgroundColor = '#131313';
	} else {
		option.backgroundColor = '#ffffff';
	}

	if (!state.theming.accentColor) {
		return;
	}

	const palette = Array.isArray(option.color)
		? option.color.filter((entry): entry is string => typeof entry === 'string')
		: [];
	const filtered = palette.filter(color => color !== state.theming.accentColor);
	option.color = [state.theming.accentColor, ...filtered];
}

function ensureAxis(option: EChartsOption, key: 'xAxis' | 'yAxis'): Record<string, unknown> {
	const axis = option[key];
	if (!axis) {
		const created = {} as Record<string, unknown>;
		option[key] = created;
		return created;
	}
	if (Array.isArray(axis)) {
		if (!axis[0]) {
			axis[0] = {};
		}
		return axis[0] as Record<string, unknown>;
	}
	return axis as Record<string, unknown>;
}

function ensureSplitLine(axis: Record<string, unknown>): SplitLineConfig {
	const current = axis.splitLine;
	if (current && typeof current === 'object') {
		return current as SplitLineConfig;
	}
	const created: SplitLineConfig = {};
	axis.splitLine = created;
	return created;
}

function normalizeSeries(option: EChartsOption): MutableSeries[] {
	option.series ??= [];
	if (!Array.isArray(option.series)) {
		option.series = [option.series as MutableSeries];
	}
	return option.series as MutableSeries[];
}

function normalizeDatasets(option: EChartsOption): MutableDataset[] {
	if (!option.dataset) {
		return [];
	}
	if (Array.isArray(option.dataset)) {
		return option.dataset as MutableDataset[];
	}
	return [option.dataset as MutableDataset];
}

function createDatasetComparator(order: 'ascending' | 'descending'): (a: number, b: number) => number {
	if (order === 'ascending') {
		return (a, b) => a - b;
	}
	return (a, b) => b - a;
}

function normalizeNumeric(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function extractYValue(row: unknown): number {
	if (Array.isArray(row)) {
		const tuple = row as unknown[];
		return normalizeNumeric(tuple[1]);
	}
	if (row && typeof row === 'object') {
		const record = row as Record<string, unknown>;
		if (Array.isArray(record.value)) {
			const tuple = record.value as unknown[];
			return normalizeNumeric(tuple[1]);
		}
		if (typeof record.y === 'number') {
			return record.y;
		}
		if (record.y != null) {
			return normalizeNumeric(record.y);
		}
	}
	return 0;
}