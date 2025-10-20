import UnifaceChart from '@ticatec/uniface-echarts';
import type ChartEventParams from '@ticatec/uniface-echarts/dist/ChartEventParams';
import type { EChartsCoreOption, EChartsType, EventParams, SetOptionOpts } from 'echarts';
import type { EChartsOption } from 'packages/obsidian/src/echarts/options';
import { ensureEChartsTheme, getEChartsThemeDefinition } from 'packages/obsidian/src/echarts/theme';

interface RuntimeState {
	themeName: string;
	themeDefinition: EChartsCoreOption;
}

interface RuntimeEvents {
	onClick?: (params: ChartEventParams) => void;
	onMouseOver?: (params: ChartEventParams) => void;
	onMouseOut?: (params: ChartEventParams) => void;
}

export type RuntimeErrorReporter = (message: string, error: unknown) => void;

export interface RuntimeChartInstance {
	chart: BasesChartBridge;
	setOption: (option: EChartsOption, opts?: SetOptionOpts) => void;
	setEvents: (handlers: RuntimeEvents) => void;
	dispose: () => void;
}

let runtimeState: RuntimeState | null = null;

export function ensureRuntime(): RuntimeState {
	if (runtimeState) {
		return runtimeState;
	}
	const themeName = ensureEChartsTheme();
	const themeDefinition = getEChartsThemeDefinition();
	runtimeState = { themeName, themeDefinition };
	return runtimeState;
}

export function createChartInstance(params: { initialOption: EChartsOption; onError?: RuntimeErrorReporter }): RuntimeChartInstance {
	const { themeDefinition } = ensureRuntime();
	const chart = new BasesChartBridge(params.initialOption, themeDefinition, params.onError);

	return {
		chart,
		setOption: (option, opts) => chart.updateOption(option, opts),
		setEvents: handlers => chart.bindEvents(handlers),
		dispose: () => chart.dispose(),
	};
}

class BasesChartBridge extends UnifaceChart {
	private option: EChartsOption;
	private readonly theme: EChartsCoreOption;
	private readonly onError?: RuntimeErrorReporter;
	private pendingHandlers: RuntimeEvents = {};
	private mouseOutListener: ((params: EventParams) => void) | null = null;

	constructor(initialOption: EChartsOption, theme: EChartsCoreOption, onError?: RuntimeErrorReporter) {
		super();
		this.option = initialOption;
		this.theme = theme;
		this.onError = onError;
	}

	updateOption(option: EChartsOption, opts?: SetOptionOpts): void {
		this.option = option;
		this.applyOption(opts);
	}

	bindEvents(handlers: RuntimeEvents): void {
		this.pendingHandlers = handlers;
		this.setEventHandlers({
			...this.eventHandlers,
			onClick: handlers.onClick ?? this.eventHandlers.onClick,
			onMouseOver: handlers.onMouseOver ?? this.eventHandlers.onMouseOver,
		});
		this.installMouseOutHandler();
	}

	protected override createOption(): EChartsOption {
		return mergeTheme(this.option, this.theme);
	}

	protected override postInitialize(chart: EChartsType): void {
		try {
			chart.clear();
			chart.setOption(mergeTheme(this.option, this.theme), { notMerge: true, lazyUpdate: false });
			this.installMouseOutHandler(chart);
		} catch (error) {
			this.reportError('Failed to initialize ECharts with the expected option payload.', error);
		}
	}

	private applyOption(opts?: SetOptionOpts): void {
		const runtimeChart = this.chart as EChartsType | undefined;
		if (!runtimeChart) {
			return;
		}

		try {
			runtimeChart.setOption(mergeTheme(this.option, this.theme), {
				notMerge: true,
				lazyUpdate: false,
				...opts,
			});
		} catch (error) {
			this.reportError('Failed to update ECharts option payload.', error);
		}
	}

	private reportError(message: string, error: unknown): void {
		this.onError?.(message, error);
	}

	private installMouseOutHandler(explicitChart?: EChartsType): void {
		const runtimeChart = explicitChart ?? (this.chart as EChartsType | undefined);
		if (!runtimeChart) {
			return;
		}

		if (this.mouseOutListener) {
			runtimeChart.off('mouseout', this.mouseOutListener);
		}

		if (!this.pendingHandlers.onMouseOut) {
			this.mouseOutListener = null;
			return;
		}

		this.mouseOutListener = (params: EventParams): void => {
			this.pendingHandlers.onMouseOut?.(params as ChartEventParams);
		};
		runtimeChart.on('mouseout', this.mouseOutListener);
	}
}

function mergeTheme(option: EChartsOption, theme: EChartsCoreOption): EChartsOption {
	const themed: EChartsOption = {
		...option,
	};

	if (themed.backgroundColor === undefined && theme.backgroundColor !== undefined) {
		themed.backgroundColor = theme.backgroundColor;
	}

	if (!themed.color && theme.color) {
		if (Array.isArray(theme.color)) {
			const palette = theme.color.filter((value): value is string => typeof value === 'string');
			themed.color = palette.length > 0 ? [...palette] : undefined;
		} else if (typeof theme.color === 'string') {
			themed.color = [theme.color];
		}
	}

	if (theme.textStyle) {
		themed.textStyle = {
			...theme.textStyle,
			...(option.textStyle ?? {}),
		};
	}

	if (theme.axisPointer) {
		themed.axisPointer = {
			...theme.axisPointer,
			...(option.axisPointer ?? {}),
		};
	}

	if (theme.tooltip) {
		themed.tooltip = {
			...theme.tooltip,
			...(option.tooltip ?? {}),
		};
	}

	if (theme.grid) {
		themed.grid = {
			...theme.grid,
			...(option.grid ?? {}),
		};
	}

	return themed;
}
