import type { FullConfig } from '@playwright/test';
import { TestVaultManager } from './utils/test-vault-manager';

/**
 * Global setup for Playwright tests
 * Prepares the test environment before running any tests
 */
async function globalSetup(config: FullConfig): Promise<void> {
	console.log('🚀 Setting up global test environment...');
	
	try {
		// Initialize test vault manager
		const vaultManager = new TestVaultManager();
		
		// Create test vaults with sample data
		await vaultManager.createTestVaults();
		
		// Set up test data
		await vaultManager.setupTestData();
		
		console.log('✅ Global test environment setup complete');
	} catch (error) {
		console.error('❌ Global setup failed:', error);
		throw error;
	}
}

export default globalSetup;