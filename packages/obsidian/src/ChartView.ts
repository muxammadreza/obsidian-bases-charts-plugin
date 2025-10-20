import type { BasesEntry, QueryController } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, Events, Notice } from 'obsidian';
import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import { emptyDataWrapper, GroupSeparatedData, PropertySeparatedData } from 'packages/obsidian/src/ChartData';
import BarPlot from 'packages/obsidian/src/charts/BarPlot.svelte';
import type { ConfigStackState } from 'packages/obsidian/src/charts/config-stack/types';
import LinePlot from 'packages/obsidian/src/charts/LinePlot.svelte';
import ScatterPlot from 'packages/obsidian/src/charts/ScatterPlot.svelte';
import { parseValueAsNumber, parseValueAsX } from 'packages/obsidian/src/utils/utils';
import { mount, unmount } from 'svelte';

export const SCATTER_CHART_VIEW_TYPE = 'chart-scatter';
export const LINE_CHART_VIEW_TYPE = 'chart-line';
export const BAR_CHART_VIEW_TYPE = 'chart-bar';

export type ChartViewType = typeof SCATTER_CHART_VIEW_TYPE | typeof LINE_CHART_VIEW_TYPE | typeof BAR_CHART_VIEW_TYPE;

export const CHART_SETTINGS = {
	X: 'x',
	SHOW_PERCENTAGES: 'show-percentages',
	SHOW_LABELS: 'show-labels',
	MULTI_CHART: 'multi-chart-mode',
	SYNC_Y_AXES: 'sync-y-axes',
	MIN_Y_OVERRIDE: 'min-y-override',
	MAX_Y_OVERRIDE: 'max-y-override',
	LABEL_PROP: 'label-property',
	CONFIG_STACK_STATE: 'config-stack-state',
} as const;

export enum MultiChartMode {
	GROUP = 'Separate by group',
	PROPERTY = 'Separate by property',
}

export interface YDomainOverrides {
	min: number | null;
	max: number | null;
	synced: boolean;
}

function parseConfigAsNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value === 'string') {
		if (value.trim() === '') {
			return null;
		}
		const parsed = Number(value);
		if (!isNaN(parsed)) {
			return parsed;
		}
	}
	return null;
}

export class ChartView extends BasesView {
	readonly type: ChartViewType;
	readonly scrollEl: HTMLElement;
	readonly events: Events;
	svelteComponent: ReturnType<typeof ScatterPlot> | null = null;
	private configStackStateCache: Record<string, ConfigStackState> | null = null;

	constructor(type: ChartViewType, controller: QueryController, scrollEl: HTMLElement) {
		super(controller);
		this.type = type;
		this.scrollEl = scrollEl;
		this.events = new Events();
	}

	onload(): void {
		this.scrollEl.addClass('bases-chart-view');

		if (this.type === SCATTER_CHART_VIEW_TYPE) {
			this.svelteComponent = mount(ScatterPlot, {
				target: this.scrollEl,
				props: {
					view: this,
				},
			});
		} else if (this.type === LINE_CHART_VIEW_TYPE) {
			this.svelteComponent = mount(LinePlot, {
				target: this.scrollEl,
				props: {
					view: this,
				},
			});
		} else if (this.type === BAR_CHART_VIEW_TYPE) {
			this.svelteComponent = mount(BarPlot, {
				target: this.scrollEl,
				props: {
					view: this,
				},
			});
		}
	}

	onunload(): void {
		if (this.svelteComponent) {
			void unmount(this.svelteComponent);
		}
	}

	onDataUpdated(): void {
		this.events.trigger('data-updated');
	}

	getChartIdentifier(chartIndex: number, chartName: string): string {
		return `${this.type}:${chartIndex}:${chartName}`;
	}

	getConfigStackState(chartId: string): ConfigStackState | null {
		const store = this.ensureConfigStackStore();
		const state = store[chartId];
		return state ? cloneStackState(state) : null;
	}

	saveConfigStackState(chartId: string, state: ConfigStackState): void {
		this.storeConfigStackState(chartId, state);
	}

	private ensureConfigStackStore(): Record<string, ConfigStackState> {
		if (this.configStackStateCache) {
			return this.configStackStateCache;
		}

		const store: Record<string, ConfigStackState> = {};
		const config = this.config;
		if (config) {
			const raw = config.get(CHART_SETTINGS.CONFIG_STACK_STATE);
			if (raw && typeof raw === 'object') {
				for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
					if (typeof key !== 'string') {
						continue;
					}
					if (isConfigStackState(value)) {
						store[key] = cloneStackState(value);
					}
				}
			}
		}

		this.configStackStateCache = store;
		return store;
	}

	private persistConfigStackStore(): void {
		const config = this.config;
		if (!config) {
			return;
		}
		const store = this.configStackStateCache ?? {};
		const serialized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(store)) {
			serialized[key] = cloneStackState(value);
		}
		config.set(CHART_SETTINGS.CONFIG_STACK_STATE, serialized);
	}

	private storeConfigStackState(chartId: string, state: ConfigStackState): void {
		if (!chartId) {
			return;
		}
		const store = this.ensureConfigStackStore();
		store[chartId] = cloneStackState(state);
		this.persistConfigStackStore();
	}

	processData(): DataWrapper {
		const config = this.config;
		if (!config) {
			return emptyDataWrapper(this);
		}

		if (!this.data) {
			return emptyDataWrapper(this);
		}

		const xField = config.getAsPropertyId(CHART_SETTINGS.X);
		const mode = config.get(CHART_SETTINGS.MULTI_CHART) ?? MultiChartMode.PROPERTY;
		const propertyOrder = config.getOrder();
		const labelProp = config.getAsPropertyId(CHART_SETTINGS.LABEL_PROP) ?? undefined;

		if (mode !== MultiChartMode.GROUP && mode !== MultiChartMode.PROPERTY) {
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			console.warn(`Invalid multi chart mode: ${mode}`);
			return emptyDataWrapper(this);
		}

		if (!xField) {
			return emptyDataWrapper(this);
		}

		const data: ProcessedData[] = [];
		const groupBySet = this.data.groupedData.map(g => g.key?.toString()).filter(k => k != null);

		for (const group of this.data?.groupedData ?? []) {
			const groupKey = group.key?.toString();
			let groupIndex: number;
			if (groupKey == null) {
				groupIndex = 0;
			} else {
				groupIndex = groupBySet.indexOf(groupKey);
			}

			for (const entry of group.entries) {
				const processedEntry = this.processEntry(entry, xField, propertyOrder, groupIndex, mode, labelProp);
				data.push(...processedEntry);
			}
		}

		if (mode === MultiChartMode.GROUP) {
			return new GroupSeparatedData(this, data, groupBySet);
		} else {
			return new PropertySeparatedData(this, data, groupBySet);
		}
	}

	processEntry(
		entry: BasesEntry,
		xField: BasesPropertyId,
		propertyOrder: BasesPropertyId[],
		groupIndex: number,
		mode: MultiChartMode,
		labelProp?: BasesPropertyId,
	): ProcessedData[] {
		try {
			const x = entry.getValue(xField);
			const xValue = parseValueAsX(x);

			if (xValue === null) {
				return [];
			}

			const result: ProcessedData[] = [];
			let i = 0;
			for (const prop of propertyOrder) {
				const yValue = parseValueAsNumber(entry.getValue(prop));
				const label = labelProp ? entry.getValue(labelProp)?.toString() : undefined;

				if (xValue !== null && yValue !== null) {
					result.push({
						x: xValue,
						y: yValue,
						groupIndex: mode === MultiChartMode.GROUP ? i : groupIndex,
						chartIndex: mode === MultiChartMode.GROUP ? groupIndex : i,
						file: entry.file.path,
						label: label,
					});
				}

				i++;
			}

			return result;
		} catch (e) {
			console.warn('Error processing entry', entry, e);
		}

		return [];
	}

	getYDomainOverrides(): YDomainOverrides {
		const config = this.config;
		if (!config) {
			return {
				min: null,
				max: null,
				synced: false,
			};
		}

		const min = config.get(CHART_SETTINGS.MIN_Y_OVERRIDE);
		const max = config.get(CHART_SETTINGS.MAX_Y_OVERRIDE);
		const synced = Boolean(config.get(CHART_SETTINGS.SYNC_Y_AXES));

		return {
			min: parseConfigAsNumber(min),
			max: parseConfigAsNumber(max),
			synced,
		};
	}

	async openFile(filePath: string, newTab: boolean): Promise<void> {
		const tFile = this.app.vault.getFileByPath(filePath);
		if (!tFile) {
			return;
		}

		const activeLeaf = this.app.workspace.getLeaf(newTab ? 'tab' : false);
		if (activeLeaf) {
			await activeLeaf.openFile(tFile, {
				state: { mode: 'source' },
			});
		}
	}

	notifyError(message: string): void {
		new Notice(`Bases Charts: ${message}`);
	}

	static getViewOptions(type: ChartViewType): ViewOption[] {
		if (type === SCATTER_CHART_VIEW_TYPE) {
			return ChartView.scatterViewOptions();
		} else if (type === LINE_CHART_VIEW_TYPE) {
			return ChartView.lineViewOptions();
		} else if (type === BAR_CHART_VIEW_TYPE) {
			return ChartView.barViewOptions();
		} else {
			return [];
		}
	}

	static commonViewOptions(): ViewOption[] {
		return [
			{
				displayName: 'Multi chart mode',
				type: 'dropdown',
				key: CHART_SETTINGS.MULTI_CHART,
				options: {
					[MultiChartMode.GROUP]: MultiChartMode.GROUP,
					[MultiChartMode.PROPERTY]: MultiChartMode.PROPERTY,
				},
				default: MultiChartMode.PROPERTY,
			},
			{
				displayName: 'X axis',
				type: 'property',
				key: CHART_SETTINGS.X,
				filter: prop => !prop.startsWith('file.'),
				placeholder: 'Property',
			},
			{
				displayName: 'Sync Y axes',
				type: 'toggle',
				key: CHART_SETTINGS.SYNC_Y_AXES,
				default: false,
			},
			{
				displayName: 'Min Y override',
				type: 'text',
				key: CHART_SETTINGS.MIN_Y_OVERRIDE,
				placeholder: 'Leave empty to disable',
				default: '',
			},
			{
				displayName: 'Max Y override',
				type: 'text',
				key: CHART_SETTINGS.MAX_Y_OVERRIDE,
				placeholder: 'Leave empty to disable',
				default: '',
			},
		];
	}

	static scatterViewOptions(): ViewOption[] {
		return [
			...ChartView.commonViewOptions(),
			{
				displayName: 'Label property',
				type: 'property',
				key: CHART_SETTINGS.LABEL_PROP,
				placeholder: 'Property',
			},
		];
	}

	static lineViewOptions(): ViewOption[] {
		return [...ChartView.commonViewOptions()];
	}

	static barViewOptions(): ViewOption[] {
		return [
			...ChartView.commonViewOptions(),
			{
				displayName: 'Show labels',
				type: 'toggle',
				key: CHART_SETTINGS.SHOW_LABELS,
				default: true,
			},
			{
				displayName: 'Show as percentages',
				type: 'toggle',
				key: CHART_SETTINGS.SHOW_PERCENTAGES,
				default: false,
			},
		];
	}
}

function cloneStackState(state: ConfigStackState): ConfigStackState {
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

function isConfigStackState(value: unknown): value is ConfigStackState {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		isSection(record.axes) &&
		isSection(record.series) &&
		isSection(record.legend) &&
		isSection(record.tooltip) &&
		isSection(record.dataset) &&
		isSection(record.interactions) &&
		isSection(record.theming)
	);
}

function isSection(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object');
}
