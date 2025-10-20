import type { ConfigStackState } from 'packages/obsidian/src/charts/config-stack/types';
import { MultiChartMode } from 'packages/obsidian/src/ChartView';
import type { ChartConfigState } from 'packages/obsidian/src/echarts/options';

export function createDefaultConfigStackState(config: ChartConfigState): ConfigStackState {
	return {
		axes: {
			xType: 'auto',
			invertX: false,
			showGridLines: true,
			yMin: config.yDomain?.[0] ?? null,
			yMax: config.yDomain?.[1] ?? null,
		},
		series: {
			showLabels: config.showLabels ?? false,
			showPercentages: config.showPercentages ?? false,
			smoothLines: false,
			stackSeries: false,
			symbolSize: 10,
			animation: true,
		},
		legend: {
			visible: true,
			position: 'top',
			orient: 'horizontal',
		},
		tooltip: {
			show: true,
			trigger: 'axis',
			shared: true,
		},
		dataset: {
			sampling: 'auto',
			sortOrder: 'none',
			grouping: config.multiChartMode,
		},
		interactions: {
			brushEnabled: false,
			dataZoomEnabled: false,
			hoverLink: true,
		},
		theming: {
			themeId: 'auto',
			accentColor: '#4c9aff',
		},
	};
}

export function createEmptyConfigStackState(): ConfigStackState {
	return {
		axes: {
			xType: 'auto',
			invertX: false,
			showGridLines: true,
			yMin: null,
			yMax: null,
		},
		series: {
			showLabels: false,
			showPercentages: false,
			smoothLines: false,
			stackSeries: false,
			symbolSize: 10,
			animation: true,
		},
		legend: {
			visible: true,
			position: 'top',
			orient: 'horizontal',
		},
		tooltip: {
			show: true,
			trigger: 'axis',
			shared: true,
		},
		dataset: {
			sampling: 'auto',
			sortOrder: 'none',
			grouping: MultiChartMode.PROPERTY,
		},
		interactions: {
			brushEnabled: false,
			dataZoomEnabled: false,
			hoverLink: true,
		},
		theming: {
			themeId: 'auto',
			accentColor: '#4c9aff',
		},
	};
}

export function cloneConfigStackState(state: ConfigStackState): ConfigStackState {
	return {
		axes: { ...state.axes },
		series: { ...state.series },
		legend: { ...state.legend },
		tooltip: { ...state.tooltip },
		dataset: { ...state.dataset },
		interactions: { ...state.interactions },
		theming: { ...state.theming },
	};
}
