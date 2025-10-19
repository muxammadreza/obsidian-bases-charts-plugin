import '../happydom';
import '../svelteLoader';

import { describe, expect, test, mock } from 'bun:test';
import type { EChartsOption } from 'packages/obsidian/src/echarts/options';

mock.module('packages/obsidian/src/charts/EChartsPlot.svelte', () => import('../mocks/MockEChartsPlot.svelte'));

await import('../obsidianMock');

const { default: PlotGridItem } = await import('packages/obsidian/src/charts/PlotGridItem.svelte');

describe('PlotGridItem', () => {
	test('invokes view.openFile when a point is clicked', async () => {
		const openFileCalls: Array<[string, boolean]> = [];
		const notifications: string[] = [];
		const view = {
			openFile: async (file: string, newTab: boolean) => {
				openFileCalls.push([file, newTab]);
			},
			notifyError: (message: string) => {
				notifications.push(message);
			},
		} as unknown as import('packages/obsidian/src/ChartView').ChartView;

		const datum = {
			value: [1, 2] as [number, number],
			rawX: 1,
			xKey: '1',
			file: 'notes/a.md',
			label: 'Alpha',
			groupIndex: 0,
			chartIndex: 0,
		};
		const option: EChartsOption & { __testDatum: typeof datum } = {
			series: [
				{
					name: 'Series 1',
					data: [datum],
				},
			],
			__testDatum: datum,
		};

		const target = document.createElement('div');
		target.style.width = '240px';
		target.style.height = '240px';
		target.style.display = 'block';
		document.body.appendChild(target);

		const component = new PlotGridItem({
			target,
			props: {
				view,
				chartName: 'Chart A',
				xAxisLabel: 'Prop X →',
				option,
				overrideErrors: [],
				forceRender: true,
			},
		});

		await Promise.resolve();

		const clickButton = target.querySelector('[data-testid="mock-echarts-click"]') as HTMLButtonElement;
		clickButton.click();
		await Promise.resolve();
		expect(openFileCalls).toContainEqual(['notes/a.md', false]);

		const newTabButton = target.querySelector('[data-testid="mock-echarts-click-newtab"]') as HTMLButtonElement;
		newTabButton.click();
		await Promise.resolve();
		expect(openFileCalls).toContainEqual(['notes/a.md', true]);

		component.$destroy();
		target.remove();
	});
});
