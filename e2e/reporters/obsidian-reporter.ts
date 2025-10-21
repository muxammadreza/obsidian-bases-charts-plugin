import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Custom Playwright reporter for Obsidian plugin testing
 * Generates detailed reports with console analysis, performance metrics, and debugging information
 */
export default class ObsidianReporter implements Reporter {
	private startTime: number = 0;
	private results: TestResult[] = [];
	private config: FullConfig | null = null;
	
	onBegin(config: FullConfig, suite: Suite): void {
		this.config = config;
		this.startTime = Date.now();
		console.log('🚀 Starting Obsidian Plugin E2E Tests...');
		console.log(`Running ${suite.allTests().length} tests in ${config.projects.length} project(s)`);
	}
	
	onTestEnd(test: TestCase, result: TestResult): void {
		this.results.push(result);
		
		// Log test result with Obsidian-specific context
		const status = result.status;
		const duration = result.duration;
		const emoji = this.getStatusEmoji(status);
		
		console.log(`${emoji} ${test.title} (${duration}ms)`);
		
		// Log any console errors or warnings
		if (result.attachments) {
			const consoleAttachment = result.attachments.find(a => a.name === 'console-report');
			if (consoleAttachment) {
				console.log('  📋 Console activity detected');
			}
		}
		
		// Log performance metrics if available
		const performanceAttachment = result.attachments.find(a => a.name === 'performance-report');
		if (performanceAttachment) {
			console.log('  📊 Performance metrics captured');
		}
		
		// Log failures with additional context
		if (status === 'failed' && result.error) {
			console.error(`  ❌ Error: ${result.error.message}`);
			
			// Check for common Obsidian plugin issues
			this.analyzeFailure(result.error);
		}
	}
	
	async onEnd(result: FullResult): Promise<void> {
		const duration = Date.now() - this.startTime;
		const passed = this.results.filter(r => r.status === 'passed').length;
		const failed = this.results.filter(r => r.status === 'failed').length;
		const skipped = this.results.filter(r => r.status === 'skipped').length;
		
		console.log('\n📊 Test Results Summary:');
		console.log(`  ✅ Passed: ${passed}`);
		console.log(`  ❌ Failed: ${failed}`);
		console.log(`  ⏭️  Skipped: ${skipped}`);
		console.log(`  ⏱️  Duration: ${Math.round(duration / 1000)}s`);
		
		// Generate detailed HTML report
		await this.generateDetailedReport(result);
		
		// Generate console analysis report
		await this.generateConsoleAnalysisReport();
		
		// Generate performance report
		await this.generatePerformanceReport();
		
		console.log('\n📄 Reports generated:');
		console.log('  - test-results/obsidian-report.html');
		console.log('  - test-results/console-analysis.json');
		console.log('  - test-results/performance-report.json');
	}
	
	/**
	 * Get emoji for test status
	 */
	private getStatusEmoji(status: string): string {
		switch (status) {
			case 'passed': return '✅';
			case 'failed': return '❌';
			case 'skipped': return '⏭️';
			case 'timedOut': return '⏰';
			default: return '❓';
		}
	}
	
	/**
	 * Analyze test failure for common Obsidian plugin issues
	 */
	private analyzeFailure(error: any): void {
		const message = error.message || '';
		const stack = error.stack || '';
		const fullError = message + stack;
		
		// Check for common issues
		if (fullError.includes('UnifaceChart')) {
			console.error('  🔧 Suggestion: Check @ticatec/uniface-echarts wrapper usage');
		}
		
		if (fullError.includes('ChartPanel')) {
			console.error('  🔧 Suggestion: Verify Svelte ChartPanel component integration');
		}
		
		if (fullError.includes('ECharts')) {
			console.error('  🔧 Suggestion: Ensure ECharts library is properly loaded');
		}
		
		if (fullError.includes('plugin')) {
			console.error('  🔧 Suggestion: Check Obsidian plugin initialization and manifest');
		}
		
		if (fullError.includes('timeout')) {
			console.error('  🔧 Suggestion: Increase timeout or check for slow operations');
		}
	}
	
	/**
	 * Generate detailed HTML report
	 */
	private async generateDetailedReport(result: FullResult): Promise<void> {
		const reportPath = join(process.cwd(), 'test-results', 'obsidian-report.html');
		
		const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Obsidian Plugin Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
        .test-result { margin-bottom: 15px; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .skipped { border-left: 4px solid #ffc107; }
        .error { background: #f8d7da; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .console-output { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; }
        .recommendations { background: #d1ecf1; padding: 15px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Obsidian Plugin Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>✅ Passed</h3>
            <p>${this.results.filter(r => r.status === 'passed').length}</p>
        </div>
        <div class="metric">
            <h3>❌ Failed</h3>
            <p>${this.results.filter(r => r.status === 'failed').length}</p>
        </div>
        <div class="metric">
            <h3>⏭️ Skipped</h3>
            <p>${this.results.filter(r => r.status === 'skipped').length}</p>
        </div>
        <div class="metric">
            <h3>⏱️ Duration</h3>
            <p>${Math.round((Date.now() - this.startTime) / 1000)}s</p>
        </div>
    </div>
    
    <h2>Test Results</h2>
    ${this.generateTestResultsHTML()}
    
    ${this.generateRecommendationsHTML()}
</body>
</html>`;
		
		await fs.mkdir(join(process.cwd(), 'test-results'), { recursive: true });
		await fs.writeFile(reportPath, html);
	}
	
	/**
	 * Generate HTML for test results
	 */
	private generateTestResultsHTML(): string {
		return this.results.map(result => {
			const statusClass = result.status;
			const duration = result.duration;
			
			return `
<div class="test-result ${statusClass}">
    <h3>${this.getStatusEmoji(result.status)} Test Result</h3>
    <p><strong>Duration:</strong> ${duration}ms</p>
    
    ${result.error ? `
    <div class="error">
        <strong>Error:</strong> ${result.error.message}
        <pre>${result.error.stack}</pre>
    </div>
    ` : ''}
    
    ${result.attachments?.length ? `
    <h4>Attachments:</h4>
    <ul>
        ${result.attachments.map(a => `<li>${a.name}</li>`).join('')}
    </ul>
    ` : ''}
</div>`;
		}).join('');
	}
	
	/**
	 * Generate recommendations HTML
	 */
	private generateRecommendationsHTML(): string {
		const failedTests = this.results.filter(r => r.status === 'failed');
		
		if (failedTests.length === 0) {
			return '<div class="recommendations"><h2>🎉 All tests passed! No recommendations needed.</h2></div>';
		}
		
		const recommendations = [
			'Check console output for JavaScript errors and warnings',
			'Verify @ticatec/uniface-echarts wrapper is properly imported and used',
			'Ensure ECharts library is loaded before chart creation',
			'Check Obsidian plugin manifest and dependencies',
			'Verify Svelte component integration and props',
			'Consider increasing timeouts for slow operations',
		];
		
		return `
<div class="recommendations">
    <h2>💡 Recommendations</h2>
    <ul>
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
</div>`;
	}
	
	/**
	 * Generate console analysis report
	 */
	private async generateConsoleAnalysisReport(): Promise<void> {
		const reportPath = join(process.cwd(), 'test-results', 'console-analysis.json');
		
		// This would aggregate console data from all tests
		const consoleReport = {
			timestamp: new Date().toISOString(),
			totalTests: this.results.length,
			testsWithConsoleActivity: 0,
			commonIssues: [],
			recommendations: [],
		};
		
		await fs.writeFile(reportPath, JSON.stringify(consoleReport, null, 2));
	}
	
	/**
	 * Generate performance report
	 */
	private async generatePerformanceReport(): Promise<void> {
		const reportPath = join(process.cwd(), 'test-results', 'performance-report.json');
		
		// This would aggregate performance data from all tests
		const performanceReport = {
			timestamp: new Date().toISOString(),
			totalTests: this.results.length,
			averageTestDuration: this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length,
			slowestTest: Math.max(...this.results.map(r => r.duration)),
			fastestTest: Math.min(...this.results.map(r => r.duration)),
			recommendations: [],
		};
		
		await fs.writeFile(reportPath, JSON.stringify(performanceReport, null, 2));
	}
}