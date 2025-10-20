import '../../happydom';
import '../../svelteLoader';
await import('../../obsidianMock');

import { describe, expect, test, mock } from 'bun:test';
import type { EChartsOption } from 'packages/obsidian/src/echarts/options';

mock.module('packages/obsidian/src/charts/EChartsPlot.svelte', () => import('../../mocks/MockEChartsPlot.svelte'));
mock.module('@ticatec/uniface-echarts/ChartPanel.svelte', () => import('../../mocks/MockChartPanel.svelte'));

const { default: PlotGridItem } = await import('packages/obsidian/src/charts/PlotGridItem.svelte');

type PlotGridItemCtor = new (args: { target: HTMLElement; props: Record<string, unknown> }) => {
	$destroy(): void;
};

declare global {
	// eslint-disable-next-line no-var
	var __mockLatestOption: EChartsOption | undefined;
}

function getLatestOption(): EChartsOption | undefined {
	return (globalThis as { __mockLatestOption?: EChartsOption }).__mockLatestOption;
}

describe('PlotGridItem config stack integration', () => {
	test('updates legend visibility through config stack changes', async () => {
		(globalThis as { __mockLatestOption?: EChartsOption }).__mockLatestOption = undefined;
		const events: Array<{ type: string; detail: unknown }> = [];
		const view = {
			openFile: async () => {},
			notifyError: () => {},
			events: {
				trigger: (type: string, detail: unknown) => {
					events.push({ type, detail });
				},
			},
		} as unknown as import('packages/obsidian/src/ChartView').ChartView;

		const option: EChartsOption = {
			legend: {
				show: true,
			},
			series: [
				{
					type: 'scatter',
					data: [],
				},
			],
		};

		const target = document.createElement('div');
		target.style.width = '240px';
		target.style.height = '240px';
		document.body.appendChild(target);

		const PlotGridItemComponent = PlotGridItem as unknown as PlotGridItemCtor;
		const component = new PlotGridItemComponent({
			target,
			props: {
				view,
				chartName: 'Chart A',
				xAxisLabel: 'X',
				option,
				errors: [],
				forceRender: true,
				chartIdentifier: 'view-0-Chart A',
			},
		});

		await Promise.resolve();
		expect((getLatestOption()?.legend as { show?: boolean } | undefined)?.show).toBe(true);

		const toggle = target.querySelector('[data-testid="config-stack-toggle"]') as HTMLButtonElement;
		toggle.click();
		await Promise.resolve();

		const legendInput = target.querySelector('[data-testid="config-stack-legend-visible"] input') as HTMLInputElement;
		legendInput.checked = false;
		legendInput.dispatchEvent(new Event('change', { bubbles: true }));
		await Promise.resolve();

		expect((getLatestOption()?.legend as { show?: boolean } | undefined)?.show).toBe(false);
		expect(events.some(entry => entry.type === 'config-stack:apply')).toBe(true);

		component.$destroy();
		target.remove();
	});
});
