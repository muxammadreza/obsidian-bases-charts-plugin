import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ChartView, YDomainOverrides } from "packages/obsidian/src/ChartView";
import { ScatterChart } from "packages/obsidian/src/charts/ScatterChart";
import { LineChart } from "packages/obsidian/src/charts/LineChart";
import { BarChart } from "packages/obsidian/src/charts/BarChart";
import type { DataWrapper, ProcessedData } from "packages/obsidian/src/ChartData";
import { GroupSeparatedData, PropertySeparatedData } from "packages/obsidian/src/ChartData";

// Mock data setup
function createMockProcessedData(): ProcessedData[] {
	return [
		{
			x: 10,
			y: 20,
			groupIndex: 0,
			chartIndex: 0,
			file: "test1.md",
			label: "Point 1",
		},
		{
			x: 20,
			y: 30,
			groupIndex: 0,
			chartIndex: 0,
			file: "test2.md",
			label: "Point 2",
		},
		{
			x: 30,
			y: 25,
			groupIndex: 1,
			chartIndex: 0,
			file: "test3.md",
			label: "Point 3",
		},
	];
}

function createMockChartView(): Partial<ChartView> {
	return {
		app: {
			vault: {
				getFileByPath: mock(() => ({ path: "test.md" })),
			},
			workspace: {
				getLeaf: mock(() => ({
					openFile: mock(() => Promise.resolve()),
				})),
			},
		} as any,
		config: {
			get: mock(() => false),
			getAsPropertyId: mock(() => "property1"),
			getOrder: mock(() => ["prop1", "prop2"]),
			getDisplayName: mock(() => "Display Name"),
		} as any,
		data: {
			properties: ["prop1", "prop2"],
		} as any,
		getYDomainOverrides: mock(() => ({
			min: null,
			max: null,
			synced: false,
		})),
		openFile: mock(() => Promise.resolve()),
		events: {
			trigger: mock(() => {}),
		} as any,
	};
}

function createMockDataWrapper(): DataWrapper {
	const data = createMockProcessedData();
	const view = createMockChartView() as ChartView;

	const wrapper = new GroupSeparatedData(view, data, ["Group 1", "Group 2"]);
	return wrapper;
}

describe("ScatterChart", () => {
	let chart: ScatterChart;
	let mockView: Partial<ChartView>;

	beforeEach(() => {
		mockView = createMockChartView();
		chart = new ScatterChart(mockView as ChartView);
	});

	it("should create a ScatterChart instance", () => {
		expect(chart).toBeDefined();
	});

	it("should handle updateData without errors", () => {
		const dataWrapper = createMockDataWrapper();
		expect(() => {
			chart.updateData(dataWrapper);
		}).not.toThrow();
	});

	it("should handle updateData with null gracefully", () => {
		expect(() => {
			chart.updateData(null as any);
		}).not.toThrow();
	});

	it("should handle configuration updates", () => {
		const mockConfig = {
			colors: { grid: "#e5e7eb", text: "#374151", background: "transparent" },
			typography: { fontSize: 12, fontFamily: "system-ui" },
			axis: {
				xAxisName: "X Axis",
				yAxisName: "Y Axis",
				showXAxis: true,
				showYAxis: true,
				showXGrid: true,
				showYGrid: true,
				rotateXLabels: false,
			},
			legend: { show: true, orient: "horizontal", position: "bottom" },
			animation: { enabled: true, duration: 300, easing: "cubicInOut" },
			interaction: { enableDataZoom: false },
		} as any;

		expect(() => {
			chart.updateConfig(mockConfig);
		}).not.toThrow();
	});

	it("should create chart options", () => {
		const dataWrapper = createMockDataWrapper();
		chart.updateData(dataWrapper);

		// Access the protected method via any type
		const options = (chart as any).createOption();
		expect(options).toBeDefined();
	});
});

describe("LineChart", () => {
	let chart: LineChart;
	let mockView: Partial<ChartView>;

	beforeEach(() => {
		mockView = createMockChartView();
		chart = new LineChart(mockView as ChartView);
	});

	it("should create a LineChart instance", () => {
		expect(chart).toBeDefined();
	});

	it("should handle updateData without errors", () => {
		const dataWrapper = createMockDataWrapper();
		expect(() => {
			chart.updateData(dataWrapper);
		}).not.toThrow();
	});

	it("should determine X-axis type correctly", () => {
		const numericData = createMockDataWrapper();
		chart.updateData(numericData);

		const options = (chart as any).createOption();
		expect(options.xAxis.type).toMatch(/value|category|time/);
	});

	it("should handle configuration with data zoom enabled", () => {
		const mockConfig = {
			colors: { grid: "#e5e7eb", text: "#374151", background: "transparent" },
			typography: { fontSize: 12, fontFamily: "system-ui" },
			axis: {
				xAxisName: "Time",
				yAxisName: "Value",
				showXAxis: true,
				showYAxis: true,
				showXGrid: true,
				showYGrid: true,
				rotateXLabels: false,
			},
			legend: { show: true, orient: "horizontal", position: "bottom" },
			animation: { enabled: true, duration: 300, easing: "cubicInOut" },
			interaction: { enableDataZoom: true },
		} as any;

		const dataWrapper = createMockDataWrapper();
		chart.updateData(dataWrapper);
		chart.updateConfig(mockConfig);

		const options = (chart as any).createOption();
		expect(options.dataZoom).toBeDefined();
		expect(Array.isArray(options.dataZoom)).toBe(true);
	});
});

describe("BarChart", () => {
	let chart: BarChart;
	let mockView: Partial<ChartView>;

	beforeEach(() => {
		mockView = createMockChartView();
		chart = new BarChart(mockView as ChartView);
	});

	it("should create a BarChart instance", () => {
		expect(chart).toBeDefined();
	});

	it("should handle updateData without errors", () => {
		const dataWrapper = createMockDataWrapper();
		expect(() => {
			chart.updateData(dataWrapper);
		}).not.toThrow();
	});

	it("should render stacked bars when multiple groups exist", () => {
		const dataWrapper = createMockDataWrapper();
		chart.updateData(dataWrapper);

		const options = (chart as any).createOption();
		const series = options.series as any[];
		expect(series).toBeDefined();
		expect(series.length).toBeGreaterThan(0);
	});

	it("should handle show labels configuration", () => {
		mockView.config!.get = mock(() => true);

		const dataWrapper = createMockDataWrapper();
		chart.updateData(dataWrapper);

		const options = (chart as any).createOption();
		const series = options.series as any[];
		expect(series[0].label.show).toBe(true);
	});

	it("should handle show percentages configuration", () => {
		mockView.config!.get = mock(() => true);

		const dataWrapper = createMockDataWrapper();
		chart.updateData(dataWrapper);

		const options = (chart as any).createOption();
		expect(options.yAxis.name).toContain("Percentage");
	});
});

describe("DataWrapper - GroupSeparatedData", () => {
	let wrapper: GroupSeparatedData;

	beforeEach(() => {
		const data = createMockProcessedData();
		const view = createMockChartView() as ChartView;
		wrapper = new GroupSeparatedData(view, data, ["Group 1", "Group 2"]);
	});

	it("should get chart identifiers", () => {
		const identifiers = wrapper.getChartIdentifiers();
		expect(identifiers.length).toBe(2);
		expect(identifiers).toContain("Group 1");
	});

	it("should get group identifiers", () => {
		const identifiers = wrapper.getGroupIdentifiers();
		expect(identifiers).toBeDefined();
	});

	it("should get chart name", () => {
		const name = wrapper.getChartName(0);
		expect(name).toBe("Group 1");
	});

	it("should detect multiple charts", () => {
		expect(wrapper.hasMultipleCharts()).toBe(true);
	});

	it("should detect multiple groups", () => {
		expect(wrapper.hasMultipleGroups()).toBe(true);
	});

	it("should get flat data for a chart", () => {
		const flatData = wrapper.getFlat(0);
		expect(Array.isArray(flatData)).toBe(true);
		expect(flatData.length).toBeGreaterThan(0);
	});

	it("should get stacked data for a chart", () => {
		const stackedData = wrapper.getStacked(0);
		expect(Array.isArray(stackedData)).toBe(true);
	});

	it("should calculate Y domain", () => {
		const domain = wrapper.getYDomainForChart(0);
		expect(Array.isArray(domain)).toBe(true);
		expect(domain.length).toBe(2);
		expect(typeof domain[0]).toBe("number");
		expect(typeof domain[1]).toBe("number");
	});

	it("should get global Y min/max", () => {
		const min = wrapper.getGlobalYMin();
		const max = wrapper.getGlobalYMax();
		expect(typeof min).toBe("number");
		expect(typeof max).toBe("number");
		expect(min).toBeLessThanOrEqual(max!);
	});
});

describe("DataWrapper - PropertySeparatedData", () => {
	let wrapper: PropertySeparatedData;

	beforeEach(() => {
		const data = [
			{
				x: 10,
				y: 20,
				groupIndex: 0,
				chartIndex: 0,
				file: "test1.md",
			},
			{
				x: 20,
				y: 30,
				groupIndex: 0,
				chartIndex: 1,
				file: "test2.md",
			},
		];
		const view = createMockChartView() as ChartView;
		wrapper = new PropertySeparatedData(view, data, ["GroupA", "GroupB"]);
	});

	it("should get chart identifiers as properties", () => {
		const identifiers = wrapper.getChartIdentifiers();
		expect(identifiers).toBeDefined();
	});

	it("should get group identifiers as group names", () => {
		const identifiers = wrapper.getGroupIdentifiers();
		expect(identifiers.length).toBe(2);
		expect(identifiers).toContain("GroupA");
	});

	it("should transform getChartName appropriately", () => {
		const name = wrapper.getChartName(0);
		expect(typeof name).toBe("string");
	});
});
