import { describe, it, expect, beforeEach } from "bun:test";
import type { ChartView } from "packages/obsidian/src/ChartView";
import type { BasesEntry, BasesPropertyId } from "obsidian";
import { sortDataByGroup } from "packages/obsidian/src/ChartData";
import type { ProcessedData } from "packages/obsidian/src/ChartData";

describe("Data Processing Utilities", () => {
	it("should sort data by group index", () => {
		const data: ProcessedData[] = [
			{
				x: 10,
				y: 20,
				groupIndex: 2,
				chartIndex: 0,
				file: "test1.md",
			},
			{
				x: 20,
				y: 30,
				groupIndex: 0,
				chartIndex: 0,
				file: "test2.md",
			},
			{
				x: 30,
				y: 25,
				groupIndex: 1,
				chartIndex: 0,
				file: "test3.md",
			},
		];

		const sorted = sortDataByGroup(data);

		expect(sorted[0].groupIndex).toBe(0);
		expect(sorted[1].groupIndex).toBe(1);
		expect(sorted[2].groupIndex).toBe(2);
	});

	it("should handle empty data array", () => {
		const sorted = sortDataByGroup([]);
		expect(sorted).toEqual([]);
	});

	it("should handle single data point", () => {
		const data = [
			{
				x: 10,
				y: 20,
				groupIndex: 1,
				chartIndex: 0,
				file: "test.md",
			},
		];

		const sorted = sortDataByGroup(data);
		expect(sorted.length).toBe(1);
		expect(sorted[0].groupIndex).toBe(1);
	});

	it("should handle data with same group indices", () => {
		const data: ProcessedData[] = [
			{
				x: 10,
				y: 20,
				groupIndex: 1,
				chartIndex: 0,
				file: "test1.md",
			},
			{
				x: 20,
				y: 30,
				groupIndex: 1,
				chartIndex: 0,
				file: "test2.md",
			},
		];

		const sorted = sortDataByGroup(data);
		expect(sorted.length).toBe(2);
		expect(sorted[0].groupIndex).toBe(1);
		expect(sorted[1].groupIndex).toBe(1);
	});

	it("should preserve other properties during sort", () => {
		const data: ProcessedData[] = [
			{
				x: 30,
				y: 25,
				groupIndex: 2,
				chartIndex: 1,
				file: "test3.md",
				label: "Point 3",
			},
			{
				x: 10,
				y: 20,
				groupIndex: 0,
				chartIndex: 0,
				file: "test1.md",
				label: "Point 1",
			},
		];

		const sorted = sortDataByGroup(data);

		// First item should be the one that had groupIndex 0
		expect(sorted[0].label).toBe("Point 1");
		expect(sorted[0].chartIndex).toBe(0);
		expect(sorted[0].file).toBe("test1.md");
	});
});

describe("Color Palette Utilities", () => {
	it("should have Obsidian color palette defined", () => {
		const { OBSIDIAN_COLOR_PALETTE } = require("packages/obsidian/src/utils/utils");
		expect(Array.isArray(OBSIDIAN_COLOR_PALETTE)).toBe(true);
		expect(OBSIDIAN_COLOR_PALETTE.length).toBeGreaterThan(0);
	});

	it("should have default single color function", () => {
		const { OBSIDIAN_DEFAULT_SINGLE_COLOR } = require("packages/obsidian/src/utils/utils");
		expect(typeof OBSIDIAN_DEFAULT_SINGLE_COLOR).toBe("function");
		const color = OBSIDIAN_DEFAULT_SINGLE_COLOR(undefined);
		expect(typeof color).toBe("string");
	});
});

describe("Processed Data Structure", () => {
	it("should create valid processed data with all required fields", () => {
		const data: ProcessedData = {
			x: 100,
			y: 200,
			groupIndex: 0,
			chartIndex: 0,
			file: "document.md",
			label: "Sample Data Point",
		};

		expect(data.x).toBe(100);
		expect(data.y).toBe(200);
		expect(data.groupIndex).toBe(0);
		expect(data.chartIndex).toBe(0);
		expect(data.file).toBe("document.md");
		expect(data.label).toBe("Sample Data Point");
	});

	it("should allow optional label field", () => {
		const data: ProcessedData = {
			x: 50,
			y: 75,
			groupIndex: 1,
			chartIndex: 1,
			file: "another.md",
		};

		expect(data.label).toBeUndefined();
	});

	it("should support different data types for x value", () => {
		// Number
		const dataNum: ProcessedData = {
			x: 42,
			y: 100,
			groupIndex: 0,
			chartIndex: 0,
			file: "test.md",
		};
		expect(typeof dataNum.x).toBe("number");

		// String
		const dataStr: ProcessedData = {
			x: "Category A",
			y: 100,
			groupIndex: 0,
			chartIndex: 0,
			file: "test.md",
		};
		expect(typeof dataStr.x).toBe("string");

		// Date
		const dataDate: ProcessedData = {
			x: new Date("2024-01-15"),
			y: 100,
			groupIndex: 0,
			chartIndex: 0,
			file: "test.md",
		};
		expect(dataDate.x instanceof Date).toBe(true);
	});

	it("should have numeric y values", () => {
		const data: ProcessedData = {
			x: 10,
			y: 99.5,
			groupIndex: 0,
			chartIndex: 0,
			file: "test.md",
		};

		expect(typeof data.y).toBe("number");
		expect(data.y).toBe(99.5);
	});

	it("should track group and chart indices correctly", () => {
		const data: ProcessedData = {
			x: 5,
			y: 15,
			groupIndex: 3,
			chartIndex: 2,
			file: "test.md",
		};

		expect(data.groupIndex).toBe(3);
		expect(data.chartIndex).toBe(2);
	});
});

describe("Multi-Chart Data Scenarios", () => {
	it("should handle multiple charts with different groups", () => {
		const multiChartData: ProcessedData[] = [
			// Chart 0, Group 0
			{ x: 1, y: 10, groupIndex: 0, chartIndex: 0, file: "a.md" },
			{ x: 2, y: 15, groupIndex: 0, chartIndex: 0, file: "a.md" },
			// Chart 0, Group 1
			{ x: 1, y: 20, groupIndex: 1, chartIndex: 0, file: "b.md" },
			{ x: 2, y: 25, groupIndex: 1, chartIndex: 0, file: "b.md" },
			// Chart 1, Group 0
			{ x: 1, y: 30, groupIndex: 0, chartIndex: 1, file: "c.md" },
			{ x: 2, y: 35, groupIndex: 0, chartIndex: 1, file: "c.md" },
		];

		const chart0Data = multiChartData.filter((d) => d.chartIndex === 0);
		const chart1Data = multiChartData.filter((d) => d.chartIndex === 1);

		expect(chart0Data.length).toBe(4);
		expect(chart1Data.length).toBe(2);
	});

	it("should calculate aggregates across data", () => {
		const data: ProcessedData[] = [
			{ x: 1, y: 10, groupIndex: 0, chartIndex: 0, file: "a.md" },
			{ x: 2, y: 20, groupIndex: 0, chartIndex: 0, file: "a.md" },
			{ x: 3, y: 30, groupIndex: 0, chartIndex: 0, file: "a.md" },
		];

		const sum = data.reduce((acc, d) => acc + d.y, 0);
		const avg = sum / data.length;
		const min = Math.min(...data.map((d) => d.y));
		const max = Math.max(...data.map((d) => d.y));

		expect(sum).toBe(60);
		expect(avg).toBe(20);
		expect(min).toBe(10);
		expect(max).toBe(30);
	});
});
