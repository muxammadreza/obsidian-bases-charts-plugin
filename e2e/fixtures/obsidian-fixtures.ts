import { test as base, type Page } from '@playwright/test';
import { ObsidianTestEnvironment } from '../utils/obsidian-test-environment';
import { ChartTestHelper } from '../utils/chart-test-helper';
import { ConsoleMonitor } from '../utils/console-monitor';
import { VisualTestingHelper } from '../utils/visual-testing-helper';
import { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * Custom Playwright fixtures for Obsidian plugin testing
 * Extends base Playwright test with Obsidian-specific utilities
 */
type ObsidianFixtures = {
	obsidianEnv: ObsidianTestEnvironment;
	chartHelper: ChartTestHelper;
	consoleMonitor: ConsoleMonitor;
	visualTesting: VisualTestingHelper;
	performanceMonitor: PerformanceMonitor;
};

/**
 * Extended test with Obsidian fixtures
 * Use this instead of the base Playwright test
 */
export const test = base.extend<ObsidianFixtures>({
	/**
	 * Obsidian test environment fixture
	 * Automatically sets up and tears down Obsidian environment
	 */
	obsidianEnv: async ({ page }, use) => {
		const env = new ObsidianTestEnvironment(page);
		
		try {
			await env.setup();
			await use(env);
		} finally {
			await env.cleanup();
		}
	},
	
	/**
	 * Chart testing helper fixture
	 * Provides utilities for testing chart functionality
	 */
	chartHelper: async ({ obsidianEnv }, use) => {
		const helper = new ChartTestHelper(obsidianEnv);
		await use(helper);
	},
	
	/**
	 * Console monitoring fixture
	 * Automatically captures and analyzes console output
	 */
	consoleMonitor: async ({ page }, use) => {
		const monitor = new ConsoleMonitor(page);
		
		try {
			await monitor.start();
			await use(monitor);
		} finally {
			await monitor.stop();
		}
	},
	
	/**
	 * Visual testing helper fixture
	 * Provides screenshot and visual regression testing utilities
	 */
	visualTesting: async ({ page }, use) => {
		const helper = new VisualTestingHelper(page);
		await use(helper);
	},
	
	/**
	 * Performance monitoring fixture
	 * Tracks performance metrics during test execution
	 */
	performanceMonitor: async ({ page }, use) => {
		const monitor = new PerformanceMonitor(page);
		
		try {
			await monitor.startMonitoring();
			await use(monitor);
		} finally {
			// Performance monitor cleanup is handled internally
		}
	},
});

// Re-export expect for convenience
export { expect } from '@playwright/test';