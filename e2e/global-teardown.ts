import type { FullConfig } from '@playwright/test';
import { TestVaultManager } from './utils/test-vault-manager';

/**
 * Global teardown for Playwright tests
 * Cleans up the test environment after all tests complete
 */
async function globalTeardown(config: FullConfig): Promise<void> {
	console.log('🧹 Cleaning up global test environment...');

	try {
		// Initialize test vault manager
		const vaultManager = new TestVaultManager();

		// Clean up test vaults and data
		await vaultManager.cleanup();

		console.log('✅ Global test environment cleanup complete');
	} catch (error) {
		console.error('❌ Global teardown failed:', error);
		// Don't throw error in teardown to avoid masking test failures
	}
}

export default globalTeardown;