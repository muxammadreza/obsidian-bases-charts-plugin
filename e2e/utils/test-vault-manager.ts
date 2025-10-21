import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Manages test vaults and their lifecycle
 * Creates, configures, and cleans up test vaults for E2E testing
 */
export class TestVaultManager {
	private readonly testVaultsDir = join(process.cwd(), 'test-vaults');
	private readonly testVaultName = 'e2e-test-vault';
	private readonly testVaultPath = join(this.testVaultsDir, this.testVaultName);
	
	/**
	 * Create test vaults with necessary configuration
	 */
	async createTestVaults(): Promise<void> {
		console.log('📁 Creating test vaults...');
		
		try {
			// Ensure test vaults directory exists
			await this.ensureDirectory(this.testVaultsDir);
			
			// Create main test vault
			await this.createTestVault();
			
			// Configure vault settings
			await this.configureVault();
			
			console.log('✅ Test vaults created successfully');
		} catch (error) {
			console.error('❌ Failed to create test vaults:', error);
			throw error;
		}
	}
	
	/**
	 * Set up test data in the vaults
	 */
	async setupTestData(): Promise<void> {
		console.log('📊 Setting up test data...');
		
		try {
			// Create sample markdown files with bases data
			await this.createSampleFiles();
			
			// Create test bases configurations
			await this.createTestBases();
			
			console.log('✅ Test data setup complete');
		} catch (error) {
			console.error('❌ Failed to setup test data:', error);
			throw error;
		}
	}
	
	/**
	 * Clean up test vaults and data
	 */
	async cleanup(): Promise<void> {
		console.log('🗑️ Cleaning up test vaults...');
		
		try {
			// Remove test vaults directory
			await this.removeDirectory(this.testVaultsDir);
			
			console.log('✅ Test vaults cleanup complete');
		} catch (error) {
			console.error('❌ Failed to cleanup test vaults:', error);
			// Don't throw to avoid masking test failures
		}
	}
	
	/**
	 * Create a single test vault
	 */
	private async createTestVault(): Promise<void> {
		// Ensure vault directory exists
		await this.ensureDirectory(this.testVaultPath);
		
		// Create .obsidian directory
		const obsidianDir = join(this.testVaultPath, '.obsidian');
		await this.ensureDirectory(obsidianDir);
		
		// Create plugins directory
		const pluginsDir = join(obsidianDir, 'plugins');
		await this.ensureDirectory(pluginsDir);
		
		// Create bases-charts plugin directory
		const pluginDir = join(pluginsDir, 'bases-charts');
		await this.ensureDirectory(pluginDir);
	}
	
	/**
	 * Configure vault settings for testing
	 */
	private async configureVault(): Promise<void> {
		const obsidianDir = join(this.testVaultPath, '.obsidian');
		
		// Create app.json with basic settings
		const appConfig = {
			legacyEditor: false,
			livePreview: true,
			showLineNumber: true,
			spellcheck: false,
			strictLineBreaks: false,
			tabSize: 4,
			useTab: true
		};
		
		await fs.writeFile(
			join(obsidianDir, 'app.json'),
			JSON.stringify(appConfig, null, 2)
		);
		
		// Create community-plugins.json to enable our plugin
		const communityPlugins = ['bases-charts'];
		
		await fs.writeFile(
			join(obsidianDir, 'community-plugins.json'),
			JSON.stringify(communityPlugins, null, 2)
		);
		
		// Create workspace.json with basic layout
		const workspace = {
			main: {
				id: 'main-workspace',
				type: 'split',
				children: [
					{
						id: 'main-leaf',
						type: 'leaf',
						state: {
							type: 'empty',
							state: {}
						}
					}
				]
			},
			left: {
				id: 'left-sidebar',
				type: 'split',
				children: [],
				collapsed: true
			},
			right: {
				id: 'right-sidebar',
				type: 'split',
				children: [],
				collapsed: true
			},
			active: 'main-leaf',
			lastOpenFiles: []
		};
		
		await fs.writeFile(
			join(obsidianDir, 'workspace.json'),
			JSON.stringify(workspace, null, 2)
		);
	}
	
	/**
	 * Create sample markdown files for testing
	 */
	private async createSampleFiles(): Promise<void> {
		const sampleFiles = [
			{
				name: 'Sample Data.md',
				content: `# Sample Data for Testing

This file contains sample data for testing the Bases Charts plugin.

## Scatter Plot Data
- Point 1: (10, 20)
- Point 2: (15, 25)
- Point 3: (20, 30)
- Point 4: (25, 35)
- Point 5: (30, 40)

## Line Chart Data
- Week 1: 100 users
- Week 2: 150 users
- Week 3: 200 users
- Week 4: 175 users
- Week 5: 225 users

## Bar Chart Data
- Category A: 45
- Category B: 67
- Category C: 23
- Category D: 89
- Category E: 34
`
			},
			{
				name: 'Test Chart 1.md',
				content: `# Test Chart 1

This is a test file for chart functionality.

Tags: #test #chart #data

Created: 2024-01-01
Modified: 2024-01-15
`
			},
			{
				name: 'Test Chart 2.md',
				content: `# Test Chart 2

Another test file with different data.

Tags: #test #visualization

Created: 2024-01-02
Modified: 2024-01-16
`
			}
		];
		
		for (const file of sampleFiles) {
			await fs.writeFile(
				join(this.testVaultPath, file.name),
				file.content
			);
		}
	}
	
	/**
	 * Create test bases configurations
	 */
	private async createTestBases(): Promise<void> {
		// This would create test bases data files
		// Implementation depends on how bases data is stored
		const basesDir = join(this.testVaultPath, '.obsidian', 'plugins', 'bases-charts', 'data');
		await this.ensureDirectory(basesDir);
		
		// Create sample bases data
		const sampleBases = {
			'test-scatter': {
				name: 'Test Scatter Data',
				type: 'scatter',
				data: [
					{ x: 10, y: 20, file: 'Test Chart 1.md' },
					{ x: 15, y: 25, file: 'Test Chart 2.md' },
					{ x: 20, y: 30, file: 'Sample Data.md' },
					{ x: 25, y: 35, file: 'Test Chart 1.md' },
					{ x: 30, y: 40, file: 'Test Chart 2.md' }
				]
			},
			'test-line': {
				name: 'Test Line Data',
				type: 'line',
				data: [
					{ x: '2024-01-01', y: 100, file: 'Test Chart 1.md' },
					{ x: '2024-01-08', y: 150, file: 'Test Chart 2.md' },
					{ x: '2024-01-15', y: 200, file: 'Sample Data.md' },
					{ x: '2024-01-22', y: 175, file: 'Test Chart 1.md' },
					{ x: '2024-01-29', y: 225, file: 'Test Chart 2.md' }
				]
			},
			'test-bar': {
				name: 'Test Bar Data',
				type: 'bar',
				data: [
					{ x: 'Category A', y: 45, file: 'Test Chart 1.md' },
					{ x: 'Category B', y: 67, file: 'Test Chart 2.md' },
					{ x: 'Category C', y: 23, file: 'Sample Data.md' },
					{ x: 'Category D', y: 89, file: 'Test Chart 1.md' },
					{ x: 'Category E', y: 34, file: 'Test Chart 2.md' }
				]
			}
		};
		
		await fs.writeFile(
			join(basesDir, 'test-bases.json'),
			JSON.stringify(sampleBases, null, 2)
		);
	}
	
	/**
	 * Ensure directory exists, create if it doesn't
	 */
	private async ensureDirectory(path: string): Promise<void> {
		try {
			await fs.access(path);
		} catch {
			await fs.mkdir(path, { recursive: true });
		}
	}
	
	/**
	 * Remove directory and all contents
	 */
	private async removeDirectory(path: string): Promise<void> {
		try {
			await fs.rm(path, { recursive: true, force: true });
		} catch (error) {
			// Ignore errors if directory doesn't exist
			console.warn(`Could not remove directory ${path}:`, error);
		}
	}
	
	/**
	 * Get the path to the test vault
	 */
	getTestVaultPath(): string {
		return this.testVaultPath;
	}
}