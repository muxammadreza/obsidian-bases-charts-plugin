import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { BasesEntry, QueryController } from 'obsidian';
import { NumberValue, StringValue } from 'obsidian';
import { ChartView, CHART_SETTINGS, MultiChartMode } from 'packages/obsidian/src/ChartView';
import { GroupSeparatedData, PropertySeparatedData } from 'packages/obsidian/src/ChartData';

function createEntry(values: Record<string, number | string>): BasesEntry {
	return {
		file: { path: values.filePath as string } as any,
		getValue(propertyId: string) {
			const key = propertyId.replace('note.', '');
			const value = values[key];
			if (typeof value === 'number') {
				return new NumberValue(value);
			}
			if (typeof value === 'string') {
				return new StringValue(value);
			}
			return null;
		},
	} as unknown as BasesEntry;
}

describe('ChartView data processing', () => {
	let controller: QueryController;
	let scrollEl: HTMLElement;

	beforeEach(() => {
		controller = {} as QueryController;
		scrollEl = document.createElement('div');
	});

	it('processes property separated datasets correctly', () => {
		const view = new ChartView('chart-scatter', controller, scrollEl);
		const order = ['note.metricA', 'note.metricB'];
		const entries = [
			createEntry({ filePath: 'penguins/0.md', metricA: 10, metricB: 20, xValue: 5, label: 'A' }),
			createEntry({ filePath: 'penguins/1.md', metricA: 12, metricB: 22, xValue: 6, label: 'B' }),
		];

		(view as any).config = {
			get: mock((key: string) => {
				if (key === CHART_SETTINGS.MULTI_CHART) {
					return MultiChartMode.PROPERTY;
				}
				if (key === CHART_SETTINGS.LABEL_PROP) {
					return 'note.label';
				}
				return null;
			}),
			getAsPropertyId: mock((key: string) => {
				if (key === CHART_SETTINGS.X) {
					return 'note.xValue';
				}
				if (key === CHART_SETTINGS.LABEL_PROP) {
					return 'note.label';
				}
				return null;
			}),
			getOrder: mock(() => order),
			getDisplayName: mock(() => 'Display name'),
		};

		(view as any).data = {
			groupedData: [{ key: 'North', entries }],
			properties: order,
		};

                const wrapper = view.processData() as PropertySeparatedData;
		expect(wrapper).toBeInstanceOf(PropertySeparatedData);
		expect(wrapper.getChartIdentifiers()).toEqual(order);
		expect(wrapper.data.length).toBeGreaterThan(0);
		expect(wrapper.data[0].label).toBe('A');
		expect(wrapper.data[0].chartIndex).toBe(0);
		expect(wrapper.data[0].groupIndex).toBe(0);
	});

	it('processes grouped datasets with multi chart mode group', () => {
		const view = new ChartView('chart-bar', controller, scrollEl);
		const order = ['note.metricA'];
		const groupEntries = [
			createEntry({ filePath: 'bar/0.md', metricA: 5, xValue: 1, label: 'Foo' }),
			createEntry({ filePath: 'bar/1.md', metricA: 7, xValue: 2, label: 'Bar' }),
		];

		(view as any).config = {
			get: mock((key: string) => {
				if (key === CHART_SETTINGS.MULTI_CHART) {
					return MultiChartMode.GROUP;
				}
				if (key === CHART_SETTINGS.LABEL_PROP) {
					return 'note.label';
				}
				return null;
			}),
			getAsPropertyId: mock((key: string) => {
				if (key === CHART_SETTINGS.X) {
					return 'note.xValue';
				}
				if (key === CHART_SETTINGS.LABEL_PROP) {
					return 'note.label';
				}
				return null;
			}),
			getOrder: mock(() => order),
			getDisplayName: mock(() => 'Display name'),
		};

		(view as any).data = {
			groupedData: [
				{ key: 'North', entries: groupEntries },
				{ key: 'South', entries: groupEntries },
			],
			properties: order,
		};

		const wrapper = view.processData();
		expect(wrapper).toBeInstanceOf(GroupSeparatedData);
		expect(wrapper.getGroupIdentifiers()).toEqual(order);
		expect(wrapper.getChartIdentifiers()).toEqual(['North', 'South']);
	});

	it('returns empty data wrapper when configuration is missing', () => {
		const view = new ChartView('chart-line', controller, scrollEl);
		(view as any).config = {
			get: mock(() => 'invalid'),
			getAsPropertyId: mock(() => null),
			getOrder: mock(() => []),
			getDisplayName: mock(() => null),
		};
		(view as any).data = { groupedData: [], properties: [] };

		const wrapper = view.processData();
		expect(wrapper.data.length).toBe(0);
	});

	it('parses y-domain overrides from configuration', () => {
		const view = new ChartView('chart-line', controller, scrollEl);
		(view as any).config = {
			get: mock((key: string) => {
				if (key === CHART_SETTINGS.MIN_Y_OVERRIDE) {
					return '10';
				}
				if (key === CHART_SETTINGS.MAX_Y_OVERRIDE) {
					return 200;
				}
				if (key === CHART_SETTINGS.SYNC_Y_AXES) {
					return true;
				}
				return null;
			}),
			getAsPropertyId: mock(() => 'note.xValue'),
			getOrder: mock(() => ['note.metric']),
			getDisplayName: mock(() => null),
		};
		(view as any).data = {
			groupedData: [
				{
					key: 'All',
					entries: [createEntry({ filePath: 'aapl/0.md', metric: 50, xValue: 1 })],
				},
			],
			properties: ['note.metric'],
		};

		const wrapper = view.processData();
		const domain = wrapper.getYDomainForChart(0);
		expect(domain[0]).toBe(10);
		expect(domain[1]).toBe(200);
	});

	it('opens files in the workspace when a file exists', async () => {
		const view = new ChartView('chart-scatter', controller, scrollEl);
		const openFileMock = mock(async () => undefined);
		const leafMock = { openFile: openFileMock };

		(view as any).app = {
			vault: {
				getFileByPath: mock(() => ({ path: 'penguins/0.md' })),
			},
			workspace: {
				getLeaf: mock(() => leafMock),
			},
		};

		await view.openFile('penguins/0.md', false);
		expect(openFileMock).toHaveBeenCalledTimes(1);
	});
});
