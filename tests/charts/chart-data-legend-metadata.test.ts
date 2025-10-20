import { describe, expect, test } from 'bun:test';
import { collectLegendMetadata, emptyDataWrapper, GroupSeparatedData } from 'packages/obsidian/src/ChartData';
import type { ChartView } from 'packages/obsidian/src/ChartView';
import type { BasesPropertyId } from 'obsidian';

interface StubViewOptions {
	properties?: BasesPropertyId[];
	displayNames?: Record<string, string>;
}

function createStubView(options: StubViewOptions = {}): ChartView {
	const { properties, displayNames } = options;
	return {
		getYDomainOverrides: () => ({ min: null, max: null, synced: false }),
		data: properties ? { properties } : undefined,
		config: displayNames
			? {
				getDisplayName: (id: BasesPropertyId) => displayNames[String(id)],
			}
			: undefined,
	} as unknown as ChartView;
}

describe('collectLegendMetadata', () => {
	test('returns empty legend when view data is unavailable', () => {
		const view = createStubView();
		const legend = collectLegendMetadata(emptyDataWrapper(view));
		expect(legend).toEqual([]);
	});

	test('falls back to default label when display name is missing', () => {
		const propId = 'prop.id' as BasesPropertyId;
		const view = createStubView({ properties: [propId] });
		const dataWrapper = new GroupSeparatedData(view, [], []);
		const legend = collectLegendMetadata(dataWrapper);
		expect(legend).toHaveLength(1);
		expect(legend[0]?.label).toBe('Group 1');
	});

	test('uses configured display name when available', () => {
		const propId = 'prop.display' as BasesPropertyId;
		const view = createStubView({
			properties: [propId],
			displayNames: { [propId]: 'Display Name' },
		});
		const dataWrapper = new GroupSeparatedData(view, [], []);
		const legend = collectLegendMetadata(dataWrapper);
		expect(legend[0]?.label).toBe('Display Name');
	});
});
