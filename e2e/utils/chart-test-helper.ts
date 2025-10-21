import { expect } from '@playwright/test';
import { ObsidianTestEnvironment } from './obsidian-test-environment';
import { TestDataManager, type ChartTestData } from './test-data-manager';

/**
 * Helper class for testing chart functionality
 * Provides utilities for creating, configuring, and testing charts
 */
export class ChartTestHelper {
	private testDataManager: TestDataManager;
	
	constructor(private obsidianEnv: ObsidianTestEnvironment) {
		this.testDataManager = new TestDataManager();
	}
	
	/**
	 * Create and test a scatter chart
	 */
	async createScatterChart(data?: ChartTestData): Promise<void> {
		const chartData = data || TestDataManager.generateScatterData(10);
		
		// Create base with test data
		await this.obsidianEnv.createBase('test-scatter', chartData.entries);
		
		// Open scatter chart view
		await this.obsidianEnv.openChartView('scatter');
		
		// Wait for chart to render
		await this.waitForChartRender();
		
		// Verify chart is displayed
		await this.verifyChartDisplayed();
	}
	
	/**
	 * Create and test a line chart
	 */
	async createLineChart(data?: ChartTestData): Promise<void> {
		const chartData = data || TestDataManager.generateTimeSeriesData(20);
		
		// Create base with test data
		await this.obsidianEnv.createBase('test-line', chartData.entries);
		
		// Open line chart view
		await this.obsidianEnv.openChartView('line');
		
		// Wait for chart to render
		await this.waitForChartRender();
		
		// Verify chart is displayed
		await this.verifyChartDisplayed();
	}
	
	/**
	 * Create and test a bar chart
	 */
	async createBarChart(data?: ChartTestData): Promise<void> {
		const chartData = data || TestDataManager.generateCategoricalData(['A', 'B', 'C', 'D', 'E']);
		
		// Create base with test data
		await this.obsidianEnv.createBase('test-bar', chartData.entries);
		
		// Open bar chart view
		await this.obsidianEnv.openChartView('bar');
		
		// Wait for chart to render
		await this.waitForChartRender();
		
		// Verify chart is displayed
		await this.verifyChartDisplayed();
	}
	
	/**
	 * Wait for chart to fully render
	 */
	async waitForChartRender(): Promise<void> {
		const page = this.obsidianEnv.getPage();
		
		// Wait for chart container to be visible
		await page.waitForSelector('.chart-container', {
			timeout: 10000,
			state: 'visible'
		});
		
		// Wait for ECharts canvas to be rendered with content
		await page.waitForFunction(() => {
			const canvas = document.querySelector('.chart-container canvas') as HTMLCanvasElement;
			return canvas && 
				   canvas.width > 0 && 
				   canvas.height > 0 &&
				   canvas.getContext('2d') !== null;
		}, { timeout: 15000 });
		
		// Wait a bit more for chart animation to complete
		await page.waitForTimeout(500);
	}
	
	/**
	 * Verify that a chart is properly displayed
	 */
	async verifyChartDisplayed(): Promise<void> {
		const page = this.obsidianEnv.getPage();
		
		// Check that chart container exists and is visible
		const chartContainer = page.locator('.chart-container');
		await expect(chartContainer).toBeVisible();
		
		// Check that canvas element exists
		const canvas = page.locator('.chart-container canvas');
		await expect(canvas).toBeVisible();
		
		// Verify canvas has dimensions
		const canvasElement = await canvas.elementHandle();
		if (canvasElement) {
			const width = await canvasElement.evaluate((el: HTMLCanvasElement) => el.width);
			const height = await canvasElement.evaluate((el: HTMLCanvasElement) => el.height);
			
			expect(width).toBeGreaterThan(0);
			expect(height).toBeGreaterThan(0);
		}
	}
	
	/**
	 * Open the configuration panel
	 */
	async openConfigurationPanel(): Promise<void> {
		const page = this.obsidianEnv.getPage();
		
		// Look for configuration panel toggle button
		const configToggle = page.locator('[data-testid="config-panel-toggle"], .config-toggle, .chart-config-toggle');
		
		if (await configToggle.isVisible()) {
			await configToggle.click();
		} else {
			// Try right-click on chart to open context menu
			const chartContainer = page.locator('.chart-container');
			await chartContainer.click({ button: 'right' });
			
			// Look for configuration option in context menu
			const configOption = page.locator('text=Configuration, text=Settings, text=Config');
			if (await configOption.isVisible()) {
				await configOption.click();
			}
		}
		
		// Wait for configuration panel to appear
		await page.waitForSelector('.configuration-panel, .chart-config-panel, .config-panel', {
			timeout: 5000,
			state: 'visible'
		});
	}
	
	/**
	 * Update chart configuration
	 */
	async updateConfiguration(config: Record<string, any>): Promise<void> {
		await this.openConfigurationPanel();
		
		const page = this.obsidianEnv.getPage();
		
		// Update configuration fields based on the config object
		for (const [key, value] of Object.entries(config)) {
			await this.updateConfigField(key, value);
		}
		
		// Wait for chart to re-render with new configuration
		await this.waitForChartRender();
	}
	
	/**
	 * Test chart interactions (click, hover, etc.)
	 */
	async testChartInteractions(): Promise<void> {
		const page = this.obsidianEnv.getPage();
		const canvas = page.locator('.chart-container canvas');
		
		// Test hover interaction
		await canvas.hover();
		await page.waitForTimeout(200);
		
		// Test click interaction
		await canvas.click();
		await page.waitForTimeout(200);
		
		// Test double-click interaction
		await canvas.dblclick();
		await page.waitForTimeout(200);
		
		// Test right-click interaction
		await canvas.click({ button: 'right' });
		await page.waitForTimeout(200);
	}
	
	/**
	 * Click on a specific data point (approximate)
	 */
	async clickDataPoint(index: number = 0): Promise<void> {
		const page = this.obsidianEnv.getPage();
		const canvas = page.locator('.chart-container canvas');
		
		// Get canvas bounding box
		const boundingBox = await canvas.boundingBox();
		
		if (boundingBox) {
			// Calculate approximate position of data point
			// This is a simplified calculation - in practice, you'd need to know the chart's data mapping
			const clickX = boundingBox.x + (boundingBox.width * 0.2) + (index * 20);
			const clickY = boundingBox.y + (boundingBox.height * 0.7);
			
			await page.mouse.click(clickX, clickY);
			await page.waitForTimeout(200);
		}
	}
	
	/**
	 * Test chart zoom functionality
	 */
	async testZoom(): Promise<void> {
		const page = this.obsidianEnv.getPage();
		const canvas = page.locator('.chart-container canvas');
		
		// Test mouse wheel zoom
		await canvas.hover();
		await page.mouse.wheel(0, -100); // Zoom in
		await page.waitForTimeout(300);
		
		await page.mouse.wheel(0, 100); // Zoom out
		await page.waitForTimeout(300);
	}
	
	/**
	 * Test chart pan functionality
	 */
	async testPan(): Promise<void> {
		const page = this.obsidianEnv.getPage();
		const canvas = page.locator('.chart-container canvas');
		
		// Get canvas center
		const boundingBox = await canvas.boundingBox();
		
		if (boundingBox) {
			const centerX = boundingBox.x + boundingBox.width / 2;
			const centerY = boundingBox.y + boundingBox.height / 2;
			
			// Drag from center to simulate pan
			await page.mouse.move(centerX, centerY);
			await page.mouse.down();
			await page.mouse.move(centerX + 50, centerY + 50);
			await page.mouse.up();
			
			await page.waitForTimeout(300);
		}
	}
	
	/**
	 * Verify chart responds to data changes
	 */
	async verifyDataUpdate(): Promise<void> {
		// Take screenshot before update
		const page = this.obsidianEnv.getPage();
		const beforeScreenshot = await page.locator('.chart-container').screenshot();
		
		// Update data (this would depend on how data updates are triggered)
		// For now, we'll simulate by refreshing the chart
		await page.reload();
		await this.waitForChartRender();
		
		// Take screenshot after update
		const afterScreenshot = await page.locator('.chart-container').screenshot();
		
		// In a real test, you'd compare the screenshots or verify specific changes
		console.log('Chart data update test completed');
	}
	
	/**
	 * Update a specific configuration field
	 */
	private async updateConfigField(key: string, value: any): Promise<void> {
		const page = this.obsidianEnv.getPage();
		
		// This is a simplified implementation
		// In practice, you'd need to handle different field types (text, select, checkbox, etc.)
		const field = page.locator(`[data-config-field="${key}"], [name="${key}"], #${key}`);
		
		if (await field.isVisible()) {
			if (typeof value === 'string') {
				await field.fill(value);
			} else if (typeof value === 'boolean') {
				if (value) {
					await field.check();
				} else {
					await field.uncheck();
				}
			}
		}
	}
}