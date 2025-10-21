/**
 * Manages test data generation and manipulation
 * Provides utilities for creating various types of test data for chart testing
 */
export class TestDataManager {
	/**
	 * Generate scatter plot test data
	 */
	static generateScatterData(size: number = 10): ChartTestData {
		const entries = [];
		
		for (let i = 0; i < size; i++) {
			entries.push({
				x: Math.random() * 100,
				y: Math.random() * 100,
				file: `test-file-${i}.md`,
				metadata: {
					created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
					tags: [`tag-${i % 3}`, 'test-data']
				}
			});
		}
		
		return {
			name: `Scatter Test Data (${size} points)`,
			type: 'scatter',
			entries,
			metadata: {
				xAxisType: 'value',
				yAxisType: 'value',
				title: `Test Scatter Chart - ${size} Points`
			}
		};
	}
	
	/**
	 * Generate time series test data
	 */
	static generateTimeSeriesData(size: number = 30): ChartTestData {
		const entries = [];
		const startDate = new Date('2024-01-01');
		
		for (let i = 0; i < size; i++) {
			const date = new Date(startDate);
			date.setDate(date.getDate() + i);
			
			entries.push({
				x: date.toISOString().split('T')[0], // YYYY-MM-DD format
				y: Math.sin(i * 0.1) * 50 + Math.random() * 20 + 100,
				file: `daily-note-${date.toISOString().split('T')[0]}.md`,
				metadata: {
					created: date,
					tags: ['daily-note', 'time-series']
				}
			});
		}
		
		return {
			name: `Time Series Test Data (${size} days)`,
			type: 'line',
			entries,
			metadata: {
				xAxisType: 'time',
				yAxisType: 'value',
				title: `Test Time Series Chart - ${size} Days`
			}
		};
	}
	
	/**
	 * Generate categorical bar chart test data
	 */
	static generateCategoricalData(categories: string[] = ['A', 'B', 'C', 'D', 'E']): ChartTestData {
		const entries = categories.map((category, index) => ({
			x: `Category ${category}`,
			y: Math.floor(Math.random() * 100) + 10,
			file: `category-${category.toLowerCase()}.md`,
			metadata: {
				created: new Date(),
				tags: ['category', `cat-${category.toLowerCase()}`]
			}
		}));
		
		return {
			name: `Categorical Test Data (${categories.length} categories)`,
			type: 'bar',
			entries,
			metadata: {
				xAxisType: 'category',
				yAxisType: 'value',
				title: `Test Bar Chart - ${categories.length} Categories`
			}
		};
	}
	
	/**
	 * Generate edge case test data
	 */
	static generateEdgeCaseData(): ChartTestData {
		const entries = [
			{
				x: 0,
				y: 0,
				file: 'zero-values.md',
				metadata: { created: new Date(), tags: ['edge-case', 'zero'] }
			},
			{
				x: Number.MAX_SAFE_INTEGER,
				y: 1,
				file: 'max-x-value.md',
				metadata: { created: new Date(), tags: ['edge-case', 'max'] }
			},
			{
				x: 1,
				y: Number.MAX_SAFE_INTEGER,
				file: 'max-y-value.md',
				metadata: { created: new Date(), tags: ['edge-case', 'max'] }
			},
			{
				x: -Number.MAX_SAFE_INTEGER,
				y: -1,
				file: 'min-values.md',
				metadata: { created: new Date(), tags: ['edge-case', 'min'] }
			},
			{
				x: 0.000001,
				y: 0.000001,
				file: 'tiny-values.md',
				metadata: { created: new Date(), tags: ['edge-case', 'tiny'] }
			}
		];
		
		return {
			name: 'Edge Case Test Data',
			type: 'scatter',
			entries,
			metadata: {
				xAxisType: 'value',
				yAxisType: 'value',
				title: 'Edge Case Test Chart'
			}
		};
	}
	
	/**
	 * Generate large dataset for performance testing
	 */
	static generateLargeDataset(size: number = 1000): ChartTestData {
		const entries = [];
		
		for (let i = 0; i < size; i++) {
			entries.push({
				x: i,
				y: Math.sin(i * 0.01) * 100 + Math.random() * 20,
				file: `large-dataset-${i}.md`,
				metadata: {
					created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
					tags: ['large-dataset', `batch-${Math.floor(i / 100)}`]
				}
			});
		}
		
		return {
			name: `Large Dataset (${size} points)`,
			type: 'line',
			entries,
			metadata: {
				xAxisType: 'value',
				yAxisType: 'value',
				title: `Performance Test Chart - ${size} Points`
			}
		};
	}
	
	/**
	 * Create a test base with the given data
	 */
	async createTestBase(name: string, data: any[]): Promise<void> {
		// This would integrate with the actual bases system
		// For now, we'll just log the operation
		console.log(`Creating test base: ${name} with ${data.length} entries`);
		
		// In a real implementation, this would:
		// 1. Use Obsidian's bases API to create a new base
		// 2. Populate it with the provided data
		// 3. Configure it for testing
	}
	
	/**
	 * Clean up test data
	 */
	async cleanup(): Promise<void> {
		console.log('🧹 Cleaning up test data...');
		
		// This would clean up any test bases or temporary data
		// Implementation depends on how bases data is stored
	}
}

/**
 * Type definitions for test data
 */
export interface ChartTestData {
	name: string;
	type: 'scatter' | 'line' | 'bar';
	entries: Array<{
		x: number | string | Date;
		y: number;
		file: string;
		metadata?: {
			created: Date;
			tags: string[];
			[key: string]: any;
		};
	}>;
	metadata: {
		xAxisType: 'value' | 'category' | 'time';
		yAxisType: 'value' | 'category';
		title: string;
		[key: string]: any;
	};
}

/**
 * Test scenarios for different chart types and configurations
 */
export interface TestScenario {
	name: string;
	description: string;
	data: ChartTestData;
	config?: any; // Chart configuration
	expectedBehavior: string[];
	skipConditions?: string[];
}