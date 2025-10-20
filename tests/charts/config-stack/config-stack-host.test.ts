import '../../happydom';
import '../../svelteLoader';
import '../../obsidianMock';

import { describe, expect, test, mock } from 'bun:test';
import type { ConfigStackApplyDetail } from 'packages/obsidian/src/charts/config-stack/types';
import { createEmptyConfigStackState } from 'packages/obsidian/src/charts/config-stack/state';
mock.module('@ticatec/uniface-echarts/ChartPanel.svelte', () => import('../../mocks/MockChartPanel.svelte'));

const { default: ConfigStackHost } = await import('packages/obsidian/src/charts/config-stack/ConfigStackHost.svelte');

describe('ConfigStackHost', () => {
	test('emits applyConfig patch when a control changes', async () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		const initialState = createEmptyConfigStackState();
		const component = new ConfigStackHost({
			target,
			props: {
				autoHideMs: 100,
				chartId: 'chart-test',
				initialState,
			},
		});

		let lastDetail: ConfigStackApplyDetail | null = null;
		component.$on(
			'applyConfig',
			(event: CustomEvent<ConfigStackApplyDetail>) => {
				lastDetail = event.detail;
			},
		);

		await Promise.resolve();

		const toggle = target.querySelector('[data-testid="config-stack-toggle"]') as HTMLButtonElement;
		toggle.click();
		await Promise.resolve();

		const legendToggle = target.querySelector('[data-testid="config-stack-legend-visible"] input') as HTMLInputElement;
		legendToggle.checked = false;
		legendToggle.dispatchEvent(new Event('change', { bubbles: true }));
		await Promise.resolve();

		expect(lastDetail).not.toBeNull();
		const detail = lastDetail!;
		expect(detail.patch.section).toBe('legend');
		expect(detail.state.legend.visible).toBe(false);

		component.$destroy();
		target.remove();
	});

	test('auto hides after pointer leaves', async () => {
		const target = document.createElement('div');
		document.body.appendChild(target);

		const component = new ConfigStackHost({
			target,
			props: {
				autoHideMs: 40,
				chartId: 'chart-hide',
				initialState: createEmptyConfigStackState(),
			},
		});

		await Promise.resolve();
		const toggle = target.querySelector('[data-testid="config-stack-toggle"]') as HTMLButtonElement;
		toggle.click();
		await Promise.resolve();

		const surface = target.querySelector('[data-testid="config-stack-surface"]');
		expect(surface).not.toBeNull();

		const pointerLeave = typeof PointerEvent === 'function'
			? new PointerEvent('pointerleave', { bubbles: true })
			: new Event('pointerleave', { bubbles: true });
		surface?.dispatchEvent(pointerLeave);
		await new Promise(resolve => setTimeout(resolve, 60));

		expect(target.querySelector('[data-testid="config-stack-surface"]')).toBeNull();

		component.$destroy();
		target.remove();
	});
});
