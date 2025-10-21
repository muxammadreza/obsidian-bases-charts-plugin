import { test, expect } from '../fixtures/obsidian-fixtures';

/**
 * Basic functionality tests for the Bases Charts plugin
 * Tests core plugin loading and basic chart creation
 */
test.describe('Basic Plugin Functionality', () => {
	test('should load Obsidian and enable plugin', async ({ obsidianEnv, consoleMonitor }) => {
		// Test is automatically set up by fixtures
		// Verify plugin is loaded
		const page = obsidianEnv.getPage();
		
		// Check that plugin is registered
		const isPluginEnabled = await page.evaluate(() => {
			return window.app?.plugins?.plugins?.['bases-charts']?.enabled === true;
		});
		
		expect(isPluginEnabled).toBe(true);
		
		// Check for any critical console errors
		const criticalIssues = consoleMonitor.getCriticalIssues();
		expect(criticalIssues).toHaveLength(0);
	});
	
	test('should create and display scatter chart', async ({ 
		obsidianEnv, 
		chartHelper, 
		consoleMonitor, 
		visualTesting 
	}) => {
		// Create scatter chart with test data
		await chartHelper.createScatterChart();
		
		// Verify chart is displayed
		await chartHelper.verifyChartDisplayed();
		
		// Capture screenshot for visual regression testing
		await visualTesting.captureChartScreenshot('scatter-chart-basic');
		
		// Check for console errors during chart creation
		const errors = consoleMonitor.getErrors();
		expect(errors).toHaveLength(0);
	});
	
	test('should create and display line chart', async ({ 
		obsidianEnv, 
		chartHelper, 
		consoleMonitor 
	}) => {
		// Create line chart with time series data
		await chartHelper.createLineChart();
		
		// Verify chart is displayed
		await chartHelper.verifyChartDisplayed();
		
		// Check for console errors
		const errors = consoleMonitor.getErrors();
		expect(errors).toHaveLength(0);
	});
	
	test('should create and display bar chart', async ({ 
		obsidianEnv, 
		chartHelper, 
		consoleMonitor 
	}) => {
		// Create bar chart with categorical data
		await chartHelper.createBarChart();
		
		// Verify chart is displayed
		await chartHelper.verifyChartDisplayed();
		
		// Check for console errors
		const errors = consoleMonitor.getErrors();
		expect(errors).toHaveLength(0);
	});
	
	test('should handle chart interactions', async ({ 
		obsidianEnv, 
		chartHelper, 
		performanceMonitor 
	}) => {
		// Create a chart first
		await chartHelper.createScatterChart();
		
		// Test chart interactions and measure performance
		const interactionResult = await performanceMonitor.measureInteractionPerformance(async () => {
			await chartHelper.testChartInteractions();
		});
		
		expect(interactionResult.success).toBe(true);
		expect(interactionResult.duration).toBeLessThan(1000); // Should be fast
	});
	
	test('should measure chart creation performance', async ({ 
		obsidianEnv, 
		chartHelper, 
		performanceMonitor 
	}) => {
		// Measure chart creation performance
		const creationResult = await performanceMonitor.measureChartCreation();
		
		expect(creationResult.success).toBe(true);
		expect(creationResult.duration).toBeLessThan(5000); // Should create within 5 seconds
		
		// Generate performance report
		const report = performanceMonitor.generateReport();
		expect(report.summary.totalMetrics).toBeGreaterThan(0);
	});
});