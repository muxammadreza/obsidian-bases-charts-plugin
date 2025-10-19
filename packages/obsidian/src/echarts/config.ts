import type { ChartView } from 'packages/obsidian/src/ChartView';
import { CHART_SETTINGS, MultiChartMode } from 'packages/obsidian/src/ChartView';
import type { ChartConfigState } from 'packages/obsidian/src/echarts/options';

export type ChartKind = 'scatter' | 'line' | 'bar';

interface ChartConfigOptions {
	chartType: ChartKind;
}

export function buildChartConfig(view: ChartView, options: ChartConfigOptions): ChartConfigState {
	const xAxisLabel = resolveXAxisLabel(view);
	const yAxisLabelBase = '↑';
	const multiChartMode = resolveMultiChartMode(view);
	const { overrides, errors: overrideParseErrors } = view.getAdvancedOverrides();
	const yDomainOverrides = view.getYDomainOverrides();

	const showLabels = options.chartType === 'bar' ? resolveBooleanSetting(view, CHART_SETTINGS.SHOW_LABELS, true) : undefined;
	const showPercentages = options.chartType === 'bar' ? resolveBooleanSetting(view, CHART_SETTINGS.SHOW_PERCENTAGES, false) : undefined;

	return {
		xAxisLabel,
		yAxisLabelBase,
		multiChartMode,
		yDomain: [yDomainOverrides.min, yDomainOverrides.max],
		showLabels,
		showPercentages,
		overrides: overrides ?? null,
		overrideParseErrors,
	};
}

function resolveXAxisLabel(view: ChartView): string {
	const xField = view.config.getAsPropertyId(CHART_SETTINGS.X);
	if (!xField) {
		return '';
	}
	const label = view.config.getDisplayName(xField);
	return label ? `${label} →` : '';
}

function resolveMultiChartMode(view: ChartView): MultiChartMode {
	const raw = view.config.get(CHART_SETTINGS.MULTI_CHART);
	if (raw === MultiChartMode.GROUP || raw === MultiChartMode.PROPERTY) {
		return raw;
	}
	return MultiChartMode.PROPERTY;
}

function resolveBooleanSetting(view: ChartView, key: (typeof CHART_SETTINGS)[keyof typeof CHART_SETTINGS], defaultValue: boolean): boolean {
	const raw = view.config.get(key);
	if (raw === undefined || raw === null) {
		return defaultValue;
	}
	if (typeof raw === 'boolean') {
		return raw;
	}
	if (typeof raw === 'string') {
		const normalized = raw.trim().toLowerCase();
		if (normalized === 'true') {
			return true;
		}
		if (normalized === 'false') {
			return false;
		}
	}
	return defaultValue;
}
