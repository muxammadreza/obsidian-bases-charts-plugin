import '../happydom';

import { describe, expect, mock, test, beforeEach } from 'bun:test';
import type { EChartsOption } from 'packages/obsidian/src/echarts/options';
import { getResolvedAccentColor, getResolvedObsidianPalette } from 'packages/obsidian/src/utils/utils';

const registerTheme = mock(() => {});
const setOption = mock<(option: EChartsOption, opts?: unknown) => void>(() => {});
const clear = mock(() => {});
const on = mock(() => {});
const off = mock(() => {});
const resize = mock(() => {});
const dispose = mock(() => {});

const chartStub = {
	setOption,
	clear,
	on,
	off,
	resize,
	dispose,
};

const init = mock(() => chartStub);

mock.module('echarts', () => ({
	registerTheme,
	init,
}));

const runtimeModule = await import('packages/obsidian/src/echarts/runtime');

const { ensureRuntime, createChartInstance } = runtimeModule;

describe('echarts runtime', () => {
	beforeEach(() => {
		registerTheme.mockReset();
		setOption.mockReset();
		clear.mockReset();
		on.mockReset();
		off.mockReset();
		resize.mockReset();
		dispose.mockReset();
		init.mockReset();
		init.mockImplementation(() => chartStub);
	});

	test('ensureRuntime registers the theme once and caches it', () => {
		const first = ensureRuntime();
		expect(registerTheme).toHaveBeenCalledTimes(1);
		const second = ensureRuntime();
		expect(registerTheme).toHaveBeenCalledTimes(1);
		expect(second.themeName).toBe(first.themeName);
		expect(second.themeDefinition).toEqual(first.themeDefinition);
	});

	test('createChartInstance applies theme defaults and binds mouseout handler', async () => {
		const errors: string[] = [];
		const runtime = createChartInstance({
			initialOption: {
				tooltip: {
					trigger: 'item',
				},
			},
			onError: message => {
				errors.push(message);
			},
		});

		runtime.setEvents({
			onMouseOut: () => {},
		});

		const host = document.createElement('div');
		await runtime.chart.init(host);

		expect(setOption.mock.calls.length).toBeGreaterThan(0);
		const lastInitialCall = setOption.mock.calls.at(-1);
		if (!lastInitialCall) {
			throw new Error('Expected setOption to be called with initialization parameters');
		}
		const [firstCall] = lastInitialCall;
		const expectedPalette = [...getResolvedObsidianPalette(), getResolvedAccentColor()];
		expect(firstCall.color).toEqual(expectedPalette);
		expect(firstCall.tooltip?.backgroundColor).toBe('rgba(0, 0, 0, 0.85)');

		expect(on).toHaveBeenCalledWith('mouseout', expect.any(Function));
		expect(errors).toEqual([]);

		runtime.setOption({
			grid: {
				left: 24,
			},
		});

		const finalCallArgs = setOption.mock.calls.at(-1);
		if (!finalCallArgs) {
			throw new Error('Expected setOption to be called with updated grid options');
		}
		const [lastCall] = finalCallArgs;
		expect(lastCall.grid?.left).toBe(24);
		expect(lastCall.backgroundColor).toBe('transparent');
	});
});
