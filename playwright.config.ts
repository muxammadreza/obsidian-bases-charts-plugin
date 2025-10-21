import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Obsidian plugin E2E testing
 * Configured specifically for testing the Bases Charts plugin in Obsidian environment
 */
export default defineConfig({
	// Test directory structure
	testDir: './e2e',
	
	// Test execution settings
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	
	// Test timeout settings
	timeout: 30 * 1000, // 30 seconds per test
	expect: {
		timeout: 5 * 1000, // 5 seconds for assertions
	},
	
	// Global test setup
	globalSetup: require.resolve('./e2e/global-setup.ts'),
	globalTeardown: require.resolve('./e2e/global-teardown.ts'),
	
	// Reporting configuration
	reporter: [
		['html', { 
			outputFolder: 'test-results/html-report',
			open: 'never'
		}],
		['junit', { 
			outputFile: 'test-results/junit.xml' 
		}],
		['json', { 
			outputFile: 'test-results/results.json' 
		}],
		// Custom reporter for Obsidian-specific analysis
		['./e2e/reporters/obsidian-reporter.ts']
	],
	
	// Default test configuration
	use: {
		// Base URL for Obsidian web version or local server
		baseURL: process.env.OBSIDIAN_BASE_URL || 'http://localhost:8080',
		
		// Browser context settings
		viewport: { width: 1280, height: 720 },
		ignoreHTTPSErrors: true,
		
		// Debugging and tracing
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		
		// Obsidian-specific settings
		extraHTTPHeaders: {
			'Accept-Language': 'en-US,en;q=0.9',
		},
		
		// Longer action timeout for Obsidian operations
		actionTimeout: 10 * 1000,
		navigationTimeout: 30 * 1000,
	},
	
	// Browser projects for cross-browser testing
	projects: [
		{
			name: 'chromium',
			use: { 
				...devices['Desktop Chrome'],
				// Obsidian works best in Chromium-based browsers
				launchOptions: {
					args: [
						'--disable-web-security',
						'--disable-features=VizDisplayCompositor',
						'--allow-running-insecure-content',
						'--disable-blink-features=AutomationControlled'
					]
				}
			},
		},
		{
			name: 'webkit',
			use: { 
				...devices['Desktop Safari'],
				// Safari testing for broader compatibility
			},
		},
		// Firefox can be enabled if needed
		// {
		//   name: 'firefox',
		//   use: { ...devices['Desktop Firefox'] },
		// },
	],
	
	// Web server configuration for local Obsidian testing
	webServer: process.env.CI ? undefined : {
		command: 'bun run test:server',
		url: 'http://localhost:8080',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
		stdout: 'pipe',
		stderr: 'pipe',
	},
	
	// Output directories
	outputDir: 'test-results/artifacts',
});