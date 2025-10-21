import type { BasesEntry, QueryController } from 'obsidian';
import type { BasesPropertyId, ViewOption } from 'obsidian';
import { BasesView, Events } from 'obsidian';
import type { DataWrapper, ProcessedData } from 'packages/obsidian/src/ChartData';
import { emptyDataWrapper, GroupSeparatedData, PropertySeparatedData } from 'packages/obsidian/src/ChartData';
import ChartViewComponent from 'packages/obsidian/src/components/ChartViewComponent.svelte';
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
	svelteComponent: unknown = null;

	constructor(type: ChartViewType, controller: QueryController, scrollEl: HTMLElement) {
		super(controller);
		this.type = type;
		this.scrollEl = scrollEl;
		this.events = new Events();
	}

	onload(): void {
		try {
			this.scrollEl.addClass('bases-chart-view');
			// Add data-type attribute for test selectors and view identification
			this.scrollEl.setAttribute('data-type', 'bases');

			// Mount Svelte component with ChartPanel
			this.svelteComponent = mount(ChartViewComponent, {
				target: this.scrollEl,
				props: {
					chartView: this,
				},
			});
		} catch (error) {
			console.error('Failed to load chart view:', error);
			this.showErrorMessage('Failed to initialize chart view', error);
		}
	}

	onunload(): void {
		try {
			// Clean up Svelte component and chart instances
			if (this.svelteComponent) {
				void unmount(this.svelteComponent as Record<string, unknown>);
				this.svelteComponent = null;
			}

			// Clean up event listeners
			this.events.offref(this);
		} catch (error) {
			console.error('Error during chart view cleanup:', error);
			// Continue cleanup even if there are errors
		}
	}

	onDataUpdated(): void {
		try {
			// Trigger event for Svelte component to update chart data
			this.events.trigger('data-updated');
		} catch (error) {
			console.error('Error updating chart data:', error);
			this.showErrorMessage('Failed to update chart data', error);
		}
	}

	processData(): DataWrapper {
		try {
			const xField = this.config.getAsPropertyId(CHART_SETTINGS.X);
			const mode = this.config.get(CHART_SETTINGS.MULTI_CHART) ?? MultiChartMode.PROPERTY;
			const propertyOrder = this.config.getOrder();

			if (mode !== MultiChartMode.GROUP && mode !== MultiChartMode.PROPERTY) {
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				console.warn(`Invalid multi chart mode: ${mode}`);
				return emptyDataWrapper(this);
			}

			if (!xField) {
				console.warn('No X field configured for chart');
				return emptyDataWrapper(this);
			}

			if (!this.data?.groupedData) {
				console.warn('No data available for chart processing');
				return emptyDataWrapper(this);
			}

			const data: ProcessedData[] = [];
			const groupBySet = this.data.groupedData.map(g => g.key?.toString()).filter(k => k != null);

			for (const group of this.data.groupedData) {
				const groupKey = group.key?.toString();
				let groupIndex: number;
				if (groupKey == null) {
					groupIndex = 0;
				} else {
					groupIndex = groupBySet.indexOf(groupKey);
				}

				for (const entry of group.entries) {
					try {
						const processedEntry = this.processEntry(entry, xField, propertyOrder, groupIndex, mode);
						data.push(...processedEntry);
					} catch (entryError) {
						console.warn('Error processing entry:', entry, entryError);
						// Continue processing other entries
					}
				}
			}

			if (mode === MultiChartMode.GROUP) {
				return new GroupSeparatedData(this, data, groupBySet);
			} else {
				return new PropertySeparatedData(this, data, groupBySet);
			}
		} catch (error) {
			console.error('Error processing chart data:', error);
			return emptyDataWrapper(this);
		}
	}

	processEntry(entry: BasesEntry, xField: BasesPropertyId, propertyOrder: BasesPropertyId[], groupIndex: number, mode: MultiChartMode): ProcessedData[] {
		try {
			const x = entry.getValue(xField);
			const xValue = parseValueAsX(x);
			const labelProp = this.config.getAsPropertyId(CHART_SETTINGS.LABEL_PROP);

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
		const min = this.config.get(CHART_SETTINGS.MIN_Y_OVERRIDE);
		const max = this.config.get(CHART_SETTINGS.MAX_Y_OVERRIDE);
		const synced = Boolean(this.config.get(CHART_SETTINGS.SYNC_Y_AXES));

		return {
			min: parseConfigAsNumber(min),
			max: parseConfigAsNumber(max),
			synced,
		};
	}

	async openFile(filePath: string, newTab: boolean): Promise<void> {
		try {
			const tFile = this.app.vault.getFileByPath(filePath);
			if (!tFile) {
				console.warn(`File not found: ${filePath}`);
				return;
			}

			const activeLeaf = this.app.workspace.getLeaf(newTab ? 'tab' : false);
			if (activeLeaf) {
				await activeLeaf.openFile(tFile, {
					state: { mode: 'source' },
				});
			} else {
				console.warn('Could not get workspace leaf for file opening');
			}
		} catch (error) {
			console.error(`Failed to open file: ${filePath}`, error);
			// Show user-friendly error message
			this.showErrorMessage(`Failed to open file: ${filePath}`, error);
		}
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

	/**
	 * Shows an error message to the user
	 * @param message - User-friendly error message
	 * @param error - The actual error object for logging
	 */
	private showErrorMessage(message: string, error?: unknown): void {
		try {
			// Clear existing content
			this.scrollEl.empty();

			// Create error display
			const errorContainer = this.scrollEl.createDiv('chart-error-container');
			errorContainer.createEl('h3', { text: 'Chart error', cls: 'chart-error-title' });
			errorContainer.createEl('p', { text: message, cls: 'chart-error-message' });

			if (error instanceof Error) {
				const details = errorContainer.createEl('details', { cls: 'chart-error-details' });
				details.createEl('summary', { text: 'Error details' });
				details.createEl('pre', { text: error.message, cls: 'chart-error-text' });

				if (error.stack) {
					details.createEl('pre', { text: error.stack, cls: 'chart-error-stack' });
				}
			}

			// Add retry button
			const retryButton = errorContainer.createEl('button', { text: 'Retry', cls: 'chart-error-retry' });
			retryButton.addEventListener('click', () => {
				try {
					this.onDataUpdated();
				} catch (retryError) {
					console.error('Error during retry:', retryError);
				}
			});
		} catch (displayError) {
			console.error('Failed to display error message:', displayError);
			// Fallback: just log the original error
			console.error('Original error:', error);
		}
	}
}
