import * as echarts from 'echarts';
import { OBSIDIAN_COLOR_PALETTE, OBSIDIAN_DEFAULT_SINGLE_COLOR } from 'packages/obsidian/src/utils/utils';

const THEME_NAME = 'obsidian-bases-charts';
let registered = false;
let cachedTheme: echarts.EChartsCoreOption | null = null;

export function ensureEChartsTheme(): string {
	if (!registered) {
		const definition = buildThemeDefinition();
		cachedTheme = definition;
		echarts.registerTheme(THEME_NAME, definition);
		registered = true;
	}
	return THEME_NAME;
}

export function getEChartsThemeDefinition(): echarts.EChartsCoreOption {
	if (cachedTheme) {
		return cachedTheme;
	}
	const definition = buildThemeDefinition();
	cachedTheme = definition;
	return definition;
}

function buildThemeDefinition(): echarts.EChartsCoreOption {
	return {
		color: [...OBSIDIAN_COLOR_PALETTE, OBSIDIAN_DEFAULT_SINGLE_COLOR(null)],
		backgroundColor: 'transparent',
		textStyle: {
			color: 'var(--bases-charts-text)',
		},
		axisPointer: {
			lineStyle: {
				color: 'var(--bases-charts-grid-hover)',
			},
		},
		tooltip: {
			backgroundColor: 'rgba(0, 0, 0, 0.85)',
			borderColor: 'rgba(255, 255, 255, 0.1)',
			textStyle: {
				color: '#ffffff',
			},
		},
		grid: {
			borderColor: 'var(--bases-charts-grid)',
			containLabel: true,
		},
	};
}
