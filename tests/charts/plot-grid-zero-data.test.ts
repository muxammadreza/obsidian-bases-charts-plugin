import '../happydom';
import '../svelteLoader';

import { describe, expect, test, mock } from 'bun:test';

const { default: PlotGrid } = await import('packages/obsidian/src/charts/PlotGrid.svelte');
const { createEmptyConfigStackState } = await import('packages/obsidian/src/charts/config-stack/state');

describe('PlotGrid zero-data handling', () => {
	test('skips option builder when no plottable data', async () => {
		const buildOption = mock(() => ({ option: {}, errors: [], defaultStackState: createEmptyConfigStackState() }));
		const view = {
			processData: () =>
				({
					hasMultipleGroups: () => false,
					hasMultipleCharts: () => false,
					getGroupIdentifiers: () => [],
					getChartIdentifiers: () => [],
					getChartName: () => '',
					getColorFromGroupIndex: () => '',
					getGroupName: () => '',
				}) as unknown,
			getChartIdentifier: (index: number) => `chart-${index}`,
			getConfigStackState: () => null,
			events: {
				on: () => {},
				off: () => {},
			},
		} as unknown as import('packages/obsidian/src/ChartView').ChartView;

		const target = document.createElement('div');
		document.body.appendChild(target);

		const component = new PlotGrid({
			target,
			props: {
				view,
				xAxisLabel: 'Prop X →',
				buildOption,
			},
		});

		expect(target.textContent).toContain('No properties selected');
		expect(buildOption).not.toHaveBeenCalled();

		component.$destroy();
		target.remove();
	});
});
