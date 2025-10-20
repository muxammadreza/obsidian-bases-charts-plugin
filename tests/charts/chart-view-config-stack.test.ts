import '../happydom';
import '../obsidianMock';

import { describe, expect, test } from 'bun:test';
import { createEmptyConfigStackState } from 'packages/obsidian/src/charts/config-stack/state';
import type { ConfigStackState } from 'packages/obsidian/src/charts/config-stack/types';
import { ChartView, CHART_SETTINGS, LINE_CHART_VIEW_TYPE } from 'packages/obsidian/src/ChartView';

function createConfigStub() {
	const store: Record<string, unknown> = {};
	return {
		get: (key: string) => store[key],
		set: (key: string, value: unknown) => {
			store[key] = value;
		},
		getAsPropertyId: () => null,
		getDisplayName: (id: string) => id,
		getOrder: () => [],
		__store: store,
	};
}

describe('ChartView config stack persistence', () => {
	test('stores and retrieves stack state per chart identifier', () => {
		const scrollEl = document.createElement('div') as HTMLElement & { addClass: (cls: string) => void };
		scrollEl.addClass = (cls: string) => {
			scrollEl.classList.add(cls);
		};
		const view = new ChartView(LINE_CHART_VIEW_TYPE, {} as unknown as import('obsidian').QueryController, scrollEl);
		const config = createConfigStub();
		Object.defineProperty(view, 'config', { value: config });
		const listeners: Record<string, Array<(detail: unknown) => void>> = {};
		Object.assign(view.events, {
			on(name: string, callback: (detail: unknown) => void) {
				(listeners[name] ??= []).push(callback);
				return {} as unknown;
			},
			off() {
				// no-op for tests
			},
			trigger(name: string, detail: unknown) {
				for (const handler of listeners[name] ?? []) {
					handler(detail);
				}
			},
		});
		view.onload();

		const chartId = view.getChartIdentifier(0, 'Chart A');
		expect(view.getConfigStackState(chartId)).toBeNull();

		const state: ConfigStackState = createEmptyConfigStackState();
		state.legend.visible = false;
		view.events.trigger('config-stack:apply', { chartId, state });

		const stored = view.getConfigStackState(chartId);
		expect(stored).not.toBeNull();
		expect(stored?.legend.visible).toBe(false);
		// mutate returned state and ensure cache is not affected
		if (stored) {
			stored.legend.visible = true;
		}
		const secondRead = view.getConfigStackState(chartId);
		expect(secondRead?.legend.visible).toBe(false);

		view.events.trigger('config-stack:revert', { chartId, state: createEmptyConfigStackState() });
		const reverted = view.getConfigStackState(chartId);
		expect(reverted?.legend.visible).toBe(true);

		const persisted = config.__store[CHART_SETTINGS.CONFIG_STACK_STATE];
		expect(persisted).toBeDefined();
	});
});
