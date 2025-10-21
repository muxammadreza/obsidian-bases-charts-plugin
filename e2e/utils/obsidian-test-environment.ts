import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { TestDataManager } from './test-data-manager';

/**
 * Manages Obsidian test environment setup and operations
 * Provides utilities for interacting with Obsidian in test scenarios
 */
export class ObsidianTestEnvironment {
	private testDataManager: TestDataManager;
	
	constructor(private page: Page) {
		this.testDataManager = new TestDataManager();
	}
	
	/**
	 * Set up the Obsidian test environment
	 * Opens Obsidian, loads test vault, and enables the plugin
	 */
	async setup(): Promise<void> {
		console.log('🔧 Setting up Obsidian test environment...');
		
		try {
			// Navigate to Obsidian
			await this.navigateToObsidian();
			
			// Wait for Obsidian to load
			await this.waitForObsidianLoad();
			
			// Open test vault
			await this.openTestVault();
			
			// Enable the Bases Charts plugin
			await this.enablePlugin();
			
			// Wait for plugin to initialize
			await this.waitForPluginReady();
			
			console.log('✅ Obsidian test environment ready');
		} catch (error) {
			console.error('❌ Failed to setup Obsidian environment:', error);
			throw error;
		}
	}
	
	/**
	 * Navigate to Obsidian application
	 */
	private async navigateToObsidian(): Promise<void> {
		await this.page.goto('/', { waitUntil: 'networkidle' });
	}
	
	/**
	 * Wait for Obsidian application to fully load
	 */
	private async waitForObsidianLoad(): Promise<void> {
		// Wait for main app container
		await this.page.waitForSelector('.app-container', { 
			timeout: 30000,
			state: 'visible'
		});
		
		// Wait for workspace to be ready
		await this.page.waitForSelector('.workspace', {
			timeout: 15000,
			state: 'visible'
		});
		
		// Wait for Obsidian app object to be available
		await this.page.waitForFunction(() => {
			return typeof window !== 'undefined' && 
				   window.app && 
				   window.app.workspace;
		}, { timeout: 10000 });
	}
	
	/**
	 * Open the test vault
	 */
	async openTestVault(): Promise<void> {
		// Check if we need to select a vault or if one is already open
		const vaultSelector = this.page.locator('.vault-selector');
		const isVaultSelectorVisible = await vaultSelector.isVisible().catch(() => false);
		
		if (isVaultSelectorVisible) {
			// Click on test vault if vault selector is visible
			await this.page.click('[data-testid="test-vault"]', { timeout: 5000 });
		}
		
		// Wait for workspace to be ready with content
		await this.page.waitForSelector('.workspace-leaf-content', {
			timeout: 15000,
			state: 'visible'
		});
	}
	
	/**
	 * Enable the Bases Charts plugin
	 */
	async enablePlugin(): Promise<void> {
		// Open settings
		await this.openSettings();
		
		// Navigate to Community plugins
		await this.page.click('text=Community plugins', { timeout: 5000 });
		
		// Look for Bases Charts plugin toggle
		const pluginToggle = this.page.locator('[data-plugin-id="bases-charts"] .checkbox-container');
		const isPluginEnabled = await pluginToggle.isChecked().catch(() => false);
		
		if (!isPluginEnabled) {
			await pluginToggle.click();
			
			// Wait for plugin to be enabled
			await this.page.waitForSelector('[data-plugin-id="bases-charts"][data-enabled="true"]', {
				timeout: 10000
			});
		}
		
		// Close settings
		await this.closeSettings();
	}
	
	/**
	 * Wait for the plugin to be fully initialized
	 */
	async waitForPluginReady(): Promise<void> {
		// Wait for plugin to be registered in app.plugins
		await this.page.waitForFunction(() => {
			return window.app?.plugins?.plugins?.['bases-charts']?.enabled === true;
		}, { timeout: 15000 });
		
		// Wait for plugin views to be registered
		await this.page.waitForFunction(() => {
			const viewRegistry = window.app?.viewRegistry;
			return viewRegistry && 
				   viewRegistry.viewByType &&
				   (viewRegistry.viewByType['bases-scatter'] || 
					viewRegistry.viewByType['bases-line'] || 
					viewRegistry.viewByType['bases-bar']);
		}, { timeout: 10000 });
	}
	
	/**
	 * Create a new base with test data
	 */
	async createBase(name: string, data: any[]): Promise<void> {
		// Implementation depends on how bases are created in the UI
		// This is a placeholder that should be implemented based on actual UI
		console.log(`Creating base: ${name} with ${data.length} entries`);
		
		// For now, we'll simulate the data being available
		// In a real implementation, this would interact with the bases UI
		await this.testDataManager.createTestBase(name, data);
	}
	
	/**
	 * Open a chart view of the specified type
	 */
	async openChartView(type: 'scatter' | 'line' | 'bar'): Promise<void> {
		// Open command palette
		await this.page.keyboard.press('Meta+P'); // Cmd+P on Mac, Ctrl+P on Windows/Linux
		
		// Type command to open chart view
		await this.page.fill('.prompt-input', `Bases: Open ${type} chart`);
		
		// Press Enter to execute command
		await this.page.keyboard.press('Enter');
		
		// Wait for chart container to appear
		await this.page.waitForSelector('.chart-container', {
			timeout: 10000,
			state: 'visible'
		});
	}
	
	/**
	 * Clean up test environment
	 */
	async cleanup(): Promise<void> {
		console.log('🧹 Cleaning up Obsidian test environment...');
		
		try {
			// Clear any test data
			await this.testDataManager.cleanup();
			
			// Close any open modals or dialogs
			await this.closeAllModals();
			
			console.log('✅ Obsidian test environment cleanup complete');
		} catch (error) {
			console.error('❌ Cleanup failed:', error);
			// Don't throw to avoid masking test failures
		}
	}
	
	/**
	 * Open Obsidian settings
	 */
	private async openSettings(): Promise<void> {
		// Try keyboard shortcut first
		await this.page.keyboard.press('Meta+,'); // Cmd+, on Mac
		
		// Wait for settings modal to appear
		await this.page.waitForSelector('.modal.mod-settings', {
			timeout: 5000,
			state: 'visible'
		});
	}
	
	/**
	 * Close Obsidian settings
	 */
	private async closeSettings(): Promise<void> {
		// Press Escape to close settings
		await this.page.keyboard.press('Escape');
		
		// Wait for settings modal to disappear
		await this.page.waitForSelector('.modal.mod-settings', {
			timeout: 5000,
			state: 'hidden'
		});
	}
	
	/**
	 * Close all open modals and dialogs
	 */
	private async closeAllModals(): Promise<void> {
		// Press Escape multiple times to close any open modals
		for (let i = 0; i < 3; i++) {
			await this.page.keyboard.press('Escape');
			await this.page.waitForTimeout(100);
		}
	}
	
	/**
	 * Get the current page instance
	 */
	getPage(): Page {
		return this.page;
	}
}