import type { Page } from '@playwright/test';

/**
 * Monitors performance metrics during test execution
 * Tracks chart rendering performance, memory usage, and other metrics
 */
export class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private isMonitoring: boolean = false;
	
	constructor(private page: Page) {}
	
	/**
	 * Start performance monitoring
	 */
	async startMonitoring(): Promise<void> {
		if (this.isMonitoring) {
			return;
		}
		
		this.isMonitoring = true;
		this.metrics = [];
		
		// Inject performance monitoring script
		await this.page.addInitScript(() => {
			// Store performance metrics globally
			(window as any).performanceMetrics = [];
			
			// Monitor chart rendering performance
			const originalSetOption = (window as any).echarts?.setOption;
			if (originalSetOption) {
				(window as any).echarts.setOption = function(...args: any[]) {
					const start = performance.now();
					const result = originalSetOption.apply(this, args);
					const end = performance.now();
					
					(window as any).performanceMetrics.push({
						type: 'chart-render',
						duration: end - start,
						timestamp: Date.now(),
						details: { args: args.length }
					});
					
					return result;
				};
			}
			
			// Monitor DOM mutations for chart updates
			const observer = new MutationObserver((mutations) => {
				const chartMutations = mutations.filter(mutation => {
					const target = mutation.target as Element;
					return target.closest && target.closest('.chart-container');
				});
				
				if (chartMutations.length > 0) {
					(window as any).performanceMetrics.push({
						type: 'chart-dom-update',
						duration: 0,
						timestamp: Date.now(),
						details: { mutations: chartMutations.length }
					});
				}
			});
			
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true
			});
		});
		
		console.log('📊 Performance monitoring started');
	}
	
	/**
	 * Measure chart creation performance
	 */
	async measureChartCreation(): Promise<PerformanceResult> {
		const start = performance.now();
		
		// Wait for chart container to appear
		await this.page.waitForSelector('.chart-container', { timeout: 10000 });
		
		// Wait for chart to be fully rendered
		await this.page.waitForFunction(() => {
			const canvas = document.querySelector('.chart-container canvas') as HTMLCanvasElement;
			return canvas && canvas.width > 0 && canvas.height > 0;
		}, { timeout: 15000 });
		
		const end = performance.now();
		const duration = end - start;
		
		const result: PerformanceResult = {
			operation: 'chart-creation',
			duration,
			timestamp: Date.now(),
			success: true,
		};
		
		this.metrics.push(result);
		return result;
	}
	
	/**
	 * Measure configuration update performance
	 */
	async measureConfigurationUpdate(updateFn: () => Promise<void>): Promise<PerformanceResult> {
		const start = performance.now();
		
		try {
			await updateFn();
			
			// Wait for chart to re-render
			await this.page.waitForTimeout(100); // Allow for debouncing
			
			const end = performance.now();
			const duration = end - start;
			
			const result: PerformanceResult = {
				operation: 'config-update',
				duration,
				timestamp: Date.now(),
				success: true,
			};
			
			this.metrics.push(result);
			return result;
		} catch (error) {
			const end = performance.now();
			const duration = end - start;
			
			const result: PerformanceResult = {
				operation: 'config-update',
				duration,
				timestamp: Date.now(),
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			
			this.metrics.push(result);
			return result;
		}
	}
	
	/**
	 * Measure memory usage
	 */
	async measureMemoryUsage(): Promise<MemoryUsage | null> {
		try {
			const memoryInfo = await this.page.evaluate(() => {
				if ('memory' in performance) {
					const memory = (performance as any).memory;
					return {
						usedJSHeapSize: memory.usedJSHeapSize,
						totalJSHeapSize: memory.totalJSHeapSize,
						jsHeapSizeLimit: memory.jsHeapSizeLimit,
						timestamp: Date.now(),
					};
				}
				return null;
			});
			
			if (memoryInfo) {
				this.metrics.push({
					operation: 'memory-measurement',
					duration: 0,
					timestamp: memoryInfo.timestamp,
					success: true,
					memoryUsage: memoryInfo,
				});
			}
			
			return memoryInfo;
		} catch (error) {
			console.warn('Could not measure memory usage:', error);
			return null;
		}
	}
	
	/**
	 * Detect memory leaks by comparing memory usage over time
	 */
	async detectMemoryLeaks(iterations: number = 5): Promise<MemoryLeakResult> {
		const measurements: MemoryUsage[] = [];
		
		// Take initial measurement
		const initialMemory = await this.measureMemoryUsage();
		if (initialMemory) {
			measurements.push(initialMemory);
		}
		
		// Perform operations that might cause memory leaks
		for (let i = 0; i < iterations; i++) {
			// Reload page to test plugin cleanup
			await this.page.reload();
			await this.page.waitForSelector('.app-container', { timeout: 30000 });
			
			// Wait for stabilization
			await this.page.waitForTimeout(1000);
			
			// Measure memory
			const memory = await this.measureMemoryUsage();
			if (memory) {
				measurements.push(memory);
			}
		}
		
		// Analyze memory trend
		if (measurements.length < 2) {
			return {
				hasLeak: false,
				measurements,
				analysis: 'Insufficient data for leak detection',
			};
		}
		
		const initialSize = measurements[0].usedJSHeapSize;
		const finalSize = measurements[measurements.length - 1].usedJSHeapSize;
		const memoryIncrease = finalSize - initialSize;
		const leakThreshold = 10 * 1024 * 1024; // 10MB
		
		return {
			hasLeak: memoryIncrease > leakThreshold,
			measurements,
			memoryIncrease,
			analysis: memoryIncrease > leakThreshold 
				? `Potential memory leak detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`
				: `Memory usage stable: ${Math.round(memoryIncrease / 1024 / 1024)}MB change`,
		};
	}
	
	/**
	 * Measure chart interaction performance
	 */
	async measureInteractionPerformance(interactionFn: () => Promise<void>): Promise<PerformanceResult> {
		const start = performance.now();
		
		try {
			await interactionFn();
			
			const end = performance.now();
			const duration = end - start;
			
			const result: PerformanceResult = {
				operation: 'chart-interaction',
				duration,
				timestamp: Date.now(),
				success: true,
			};
			
			this.metrics.push(result);
			return result;
		} catch (error) {
			const end = performance.now();
			const duration = end - start;
			
			const result: PerformanceResult = {
				operation: 'chart-interaction',
				duration,
				timestamp: Date.now(),
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			
			this.metrics.push(result);
			return result;
		}
	}
	
	/**
	 * Get browser performance metrics
	 */
	async getBrowserMetrics(): Promise<BrowserMetrics> {
		const metrics = await this.page.evaluate(() => {
			const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			const paint = performance.getEntriesByType('paint');
			
			return {
				navigation: {
					domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
					loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
					domInteractive: navigation.domInteractive - navigation.fetchStart,
				},
				paint: {
					firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
					firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
				},
				timestamp: Date.now(),
			};
		});
		
		this.metrics.push({
			operation: 'browser-metrics',
			duration: 0,
			timestamp: metrics.timestamp,
			success: true,
			browserMetrics: metrics,
		});
		
		return metrics;
	}
	
	/**
	 * Generate performance report
	 */
	generateReport(): PerformanceReport {
		const chartCreationMetrics = this.metrics.filter(m => m.operation === 'chart-creation');
		const configUpdateMetrics = this.metrics.filter(m => m.operation === 'config-update');
		const interactionMetrics = this.metrics.filter(m => m.operation === 'chart-interaction');
		const memoryMetrics = this.metrics.filter(m => m.memoryUsage);
		
		return {
			summary: {
				totalMetrics: this.metrics.length,
				averageChartCreationTime: this.calculateAverage(chartCreationMetrics.map(m => m.duration)),
				averageConfigUpdateTime: this.calculateAverage(configUpdateMetrics.map(m => m.duration)),
				averageInteractionTime: this.calculateAverage(interactionMetrics.map(m => m.duration)),
				memoryMeasurements: memoryMetrics.length,
			},
			metrics: this.metrics,
			recommendations: this.generateRecommendations(),
		};
	}
	
	/**
	 * Calculate average of an array of numbers
	 */
	private calculateAverage(numbers: number[]): number {
		if (numbers.length === 0) return 0;
		return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
	}
	
	/**
	 * Generate performance recommendations
	 */
	private generateRecommendations(): string[] {
		const recommendations: string[] = [];
		
		const chartCreationMetrics = this.metrics.filter(m => m.operation === 'chart-creation');
		const avgCreationTime = this.calculateAverage(chartCreationMetrics.map(m => m.duration));
		
		if (avgCreationTime > 2000) {
			recommendations.push('Chart creation time is slow (>2s). Consider optimizing data processing or chart configuration.');
		}
		
		const configUpdateMetrics = this.metrics.filter(m => m.operation === 'config-update');
		const avgUpdateTime = this.calculateAverage(configUpdateMetrics.map(m => m.duration));
		
		if (avgUpdateTime > 500) {
			recommendations.push('Configuration updates are slow (>500ms). Consider debouncing or optimizing update logic.');
		}
		
		const memoryMetrics = this.metrics.filter(m => m.memoryUsage);
		if (memoryMetrics.length > 1) {
			const initialMemory = memoryMetrics[0].memoryUsage!.usedJSHeapSize;
			const finalMemory = memoryMetrics[memoryMetrics.length - 1].memoryUsage!.usedJSHeapSize;
			const memoryIncrease = finalMemory - initialMemory;
			
			if (memoryIncrease > 5 * 1024 * 1024) { // 5MB
				recommendations.push('Significant memory usage increase detected. Check for memory leaks in chart instances.');
			}
		}
		
		return recommendations;
	}
	
	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics = [];
	}
}

/**
 * Type definitions
 */
interface PerformanceMetric {
	operation: string;
	duration: number;
	timestamp: number;
	success: boolean;
	error?: string;
	memoryUsage?: MemoryUsage;
	browserMetrics?: BrowserMetrics;
}

interface PerformanceResult extends PerformanceMetric {}

interface MemoryUsage {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	timestamp: number;
}

interface MemoryLeakResult {
	hasLeak: boolean;
	measurements: MemoryUsage[];
	memoryIncrease?: number;
	analysis: string;
}

interface BrowserMetrics {
	navigation: {
		domContentLoaded: number;
		loadComplete: number;
		domInteractive: number;
	};
	paint: {
		firstPaint: number;
		firstContentfulPaint: number;
	};
	timestamp: number;
}

interface PerformanceReport {
	summary: {
		totalMetrics: number;
		averageChartCreationTime: number;
		averageConfigUpdateTime: number;
		averageInteractionTime: number;
		memoryMeasurements: number;
	};
	metrics: PerformanceMetric[];
	recommendations: string[];
}