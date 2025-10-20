import * as echarts from 'echarts';
import { getResolvedObsidianPalette, getResolvedAccentColor, resolveCssColor } from 'packages/obsidian/src/utils/utils';

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
		color: [...getResolvedObsidianPalette(), getResolvedAccentColor()],
		backgroundColor: 'transparent',
		textStyle: {
			color: resolveCssColor('var(--bases-charts-text)', '#e0e3e8'),
		},
		axisPointer: {
			lineStyle: {
				color: resolveCssColor('var(--bases-charts-grid-hover)', 'rgba(224, 227, 232, 0.45)'),
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
			borderColor: resolveCssColor('var(--bases-charts-grid)', 'rgba(224, 227, 232, 0.25)'),
			containLabel: true,
		},
	};
}
