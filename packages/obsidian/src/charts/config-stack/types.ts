import type { ChartConfigState } from 'packages/obsidian/src/echarts/options';

export type ConfigStackSection = 'axes' | 'series' | 'legend' | 'tooltip' | 'dataset' | 'interactions' | 'theming';

export interface AxesConfigState {
	xType: 'auto' | 'value' | 'category' | 'time';
	invertX: boolean;
	showGridLines: boolean;
	yMin: number | null;
	yMax: number | null;
}

export interface SeriesConfigState {
	showLabels: boolean;
	showPercentages: boolean;
	smoothLines: boolean;
	stackSeries: boolean;
	symbolSize: number;
	animation: boolean;
}

export interface LegendConfigState {
	visible: boolean;
	position: 'top' | 'right' | 'bottom' | 'left';
	orient: 'horizontal' | 'vertical';
}

export interface TooltipConfigState {
	show: boolean;
	trigger: 'item' | 'axis';
	shared: boolean;
}

export interface DatasetConfigState {
	sampling: 'auto' | 'lttb' | 'average' | 'min' | 'max';
	sortOrder: 'none' | 'ascending' | 'descending';
	grouping: ChartConfigState['multiChartMode'];
}

export interface InteractionConfigState {
	brushEnabled: boolean;
	dataZoomEnabled: boolean;
	hoverLink: boolean;
}

export interface ThemingConfigState {
	themeId: 'auto' | 'light' | 'dark';
	accentColor: string;
}

export interface ConfigStackState {
	axes: AxesConfigState;
	series: SeriesConfigState;
	legend: LegendConfigState;
	tooltip: TooltipConfigState;
	dataset: DatasetConfigState;
	interactions: InteractionConfigState;
	theming: ThemingConfigState;
}

export interface ConfigStackToggleDetail {
	chartId: string;
	visible: boolean;
	pinned: boolean;
}

export interface ConfigStackApplyDetail {
	chartId: string;
	state: ConfigStackState;
}

export interface ConfigStackRevertDetail {
	chartId: string;
	state: ConfigStackState;
}
