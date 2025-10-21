import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Bases Charts Plugin', function () {
	before(async function () {
		await obsidianPage.resetVault('test/vaults/exampleVault');
	});

	beforeEach(async function () {
		await obsidianPage.resetVault('test/vaults/exampleVault');
	});

	it('renders penguins scatter chart', async function () {
		await obsidianPage.openFile('penguins.base');

		const chartContainer = await browser.$('.bases-chart-view .chart-container');
		await chartContainer.waitForExist({ timeout: 15000 });

		await browser.waitUntil(
			async () => {
				const initialized = await chartContainer.$('[data-echarts-instance]');
				return await initialized.isExisting();
			},
			{
				timeout: 15000,
				timeoutMsg: 'Expected scatter chart container to initialize ECharts',
			},
		);

		const viewInfo = await browser.executeObsidian(({ app }) => {
			const leaf = app.workspace.getMostRecentLeaf();
			if (!leaf) {
				return null;
			}

			const view: any = leaf.view as any;
			const activeView = view.view ?? view.basesView ?? view;
			return {
				viewType: activeView?.type ?? activeView?.getViewType?.(),
				dataLength: activeView?.processData?.().data.length,
			};
		});

		expect(viewInfo).not.toBeNull();
		expect(viewInfo?.viewType).toBe('chart-scatter');
		expect(viewInfo?.dataLength ?? 0).toBeGreaterThan(0);
	});

	it('renders grouped bar chart with configured options', async function () {
		await obsidianPage.openFile('bar.base');

		const chartContainer = await browser.$('.bases-chart-view .chart-container');
		await chartContainer.waitForExist({ timeout: 15000 });

		await browser.waitUntil(
			async () => {
				const initialized = await chartContainer.$('[data-echarts-instance]');
				return await initialized.isExisting();
			},
			{
				timeout: 15000,
				timeoutMsg: 'Expected bar chart container to initialize ECharts',
			},
		);

		const chartSummary = await browser.executeObsidian(({ app }) => {
			const leaf = app.workspace.getMostRecentLeaf();
			if (!leaf) {
				return null;
			}

			const view: any = leaf.view as any;
			const activeView = view.view ?? view.basesView ?? view;
			if (!activeView?.processData) {
				return null;
			}
			const wrapper = activeView.processData();
			return {
				viewType: activeView.type,
				chartCount: wrapper.getChartIdentifiers().length,
				groupCount: wrapper.getGroupIdentifiers().length,
			};
		});

		expect(chartSummary).not.toBeNull();
		expect(chartSummary?.viewType).toBe('chart-bar');
		expect(chartSummary?.chartCount ?? 0).toBeGreaterThan(0);
		expect(chartSummary?.groupCount ?? 0).toBeGreaterThan(1);
	});
});
