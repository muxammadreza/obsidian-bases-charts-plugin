import type { Page, ConsoleMessage } from '@playwright/test';

/**
 * Monitors and analyzes console output during test execution
 * Provides automated error detection and issue categorization
 */
export class ConsoleMonitor {
	private messages: CapturedConsoleMessage[] = [];
	private errorPatterns: ErrorPattern[] = [];
	private isMonitoring: boolean = false;
	
	constructor(private page: Page) {
		this.setupErrorPatterns();
	}
	
	/**
	 * Start monitoring console messages
	 */
	async start(): Promise<void> {
		if (this.isMonitoring) {
			return;
		}
		
		this.isMonitoring = true;
		this.messages = [];
		
		// Listen for console messages
		this.page.on('console', this.handleConsoleMessage.bind(this));
		
		// Listen for page errors
		this.page.on('pageerror', this.handlePageError.bind(this));
		
		// Listen for unhandled promise rejections
		this.page.on('requestfailed', this.handleRequestFailed.bind(this));
		
		console.log('🔍 Console monitoring started');
	}
	
	/**
	 * Stop monitoring console messages
	 */
	async stop(): Promise<void> {
		if (!this.isMonitoring) {
			return;
		}
		
		this.isMonitoring = false;
		
		// Remove event listeners
		this.page.off('console', this.handleConsoleMessage.bind(this));
		this.page.off('pageerror', this.handlePageError.bind(this));
		this.page.off('requestfailed', this.handleRequestFailed.bind(this));
		
		console.log('🔍 Console monitoring stopped');
	}
	
	/**
	 * Handle console messages
	 */
	private handleConsoleMessage(msg: ConsoleMessage): void {
		const message: CapturedConsoleMessage = {
			type: msg.type(),
			text: msg.text(),
			location: msg.location(),
			timestamp: new Date(),
			args: msg.args().map(arg => arg.toString()),
		};
		
		this.messages.push(message);
		
		// Analyze message for known patterns
		this.analyzeMessage(message);
		
		// Log critical errors immediately
		if (message.type === 'error') {
			console.error(`🚨 Console Error: ${message.text}`);
		}
	}
	
	/**
	 * Handle page errors
	 */
	private handlePageError(error: Error): void {
		const message: CapturedConsoleMessage = {
			type: 'error',
			text: error.message,
			location: { url: this.page.url(), lineNumber: 0, columnNumber: 0 },
			timestamp: new Date(),
			stack: error.stack,
			args: [],
		};
		
		this.messages.push(message);
		this.analyzeMessage(message);
		
		console.error(`🚨 Page Error: ${error.message}`);
	}
	
	/**
	 * Handle failed requests
	 */
	private handleRequestFailed(request: any): void {
		const message: CapturedConsoleMessage = {
			type: 'error',
			text: `Request failed: ${request.url()} - ${request.failure()?.errorText}`,
			location: { url: this.page.url(), lineNumber: 0, columnNumber: 0 },
			timestamp: new Date(),
			args: [],
		};
		
		this.messages.push(message);
		console.warn(`⚠️ Request Failed: ${request.url()}`);
	}
	
	/**
	 * Set up error patterns for automated detection
	 */
	private setupErrorPatterns(): void {
		this.errorPatterns = [
			{
				pattern: /UnifaceChart.*is.*not.*a.*constructor/i,
				severity: 'critical',
				category: 'wrapper',
				description: 'UnifaceChart wrapper not properly imported or initialized',
				suggestedFix: 'Check @ticatec/uniface-echarts import and installation'
			},
			{
				pattern: /ChartPanel.*failed.*to.*mount/i,
				severity: 'critical',
				category: 'svelte',
				description: 'Svelte ChartPanel component failed to mount',
				suggestedFix: 'Check Svelte component structure and props'
			},
			{
				pattern: /ECharts.*is.*not.*defined/i,
				severity: 'critical',
				category: 'echarts',
				description: 'ECharts library not loaded or accessible',
				suggestedFix: 'Verify ECharts dependency and import'
			},
			{
				pattern: /Cannot.*read.*property.*'invalidate'/i,
				severity: 'high',
				category: 'wrapper',
				description: 'Chart instance not properly initialized before calling invalidate',
				suggestedFix: 'Ensure chart is created before calling wrapper methods'
			},
			{
				pattern: /TypeError.*Cannot.*read.*property/i,
				severity: 'high',
				category: 'general',
				description: 'Null or undefined property access',
				suggestedFix: 'Add null checks and proper initialization'
			},
			{
				pattern: /ReferenceError.*is.*not.*defined/i,
				severity: 'high',
				category: 'general',
				description: 'Variable or function not defined',
				suggestedFix: 'Check imports and variable declarations'
			},
			{
				pattern: /Failed.*to.*load.*plugin/i,
				severity: 'critical',
				category: 'obsidian',
				description: 'Obsidian plugin failed to load',
				suggestedFix: 'Check plugin manifest and dependencies'
			},
			{
				pattern: /Svelte.*component.*error/i,
				severity: 'high',
				category: 'svelte',
				description: 'Svelte component runtime error',
				suggestedFix: 'Check component props and lifecycle methods'
			},
			{
				pattern: /Configuration.*panel.*error/i,
				severity: 'medium',
				category: 'ui',
				description: 'Configuration panel error',
				suggestedFix: 'Check configuration panel component and state management'
			},
		];
	}
	
	/**
	 * Analyze a message against known error patterns
	 */
	private analyzeMessage(message: CapturedConsoleMessage): void {
		for (const pattern of this.errorPatterns) {
			if (pattern.pattern.test(message.text) || (message.stack && pattern.pattern.test(message.stack))) {
				message.detectedIssue = {
					pattern: pattern.pattern.source,
					severity: pattern.severity,
					category: pattern.category,
					description: pattern.description,
					suggestedFix: pattern.suggestedFix,
				};
				
				// Log critical issues immediately
				if (pattern.severity === 'critical') {
					console.error(`🚨 CRITICAL ISSUE DETECTED: ${pattern.description}`);
					console.error(`💡 Suggested Fix: ${pattern.suggestedFix}`);
				}
				
				break; // Only match first pattern
			}
		}
	}
	
	/**
	 * Get all captured messages
	 */
	getMessages(): CapturedConsoleMessage[] {
		return [...this.messages];
	}
	
	/**
	 * Get messages by type
	 */
	getMessagesByType(type: string): CapturedConsoleMessage[] {
		return this.messages.filter(msg => msg.type === type);
	}
	
	/**
	 * Get error messages
	 */
	getErrors(): CapturedConsoleMessage[] {
		return this.getMessagesByType('error');
	}
	
	/**
	 * Get warning messages
	 */
	getWarnings(): CapturedConsoleMessage[] {
		return this.getMessagesByType('warning');
	}
	
	/**
	 * Get messages with detected issues
	 */
	getDetectedIssues(): CapturedConsoleMessage[] {
		return this.messages.filter(msg => msg.detectedIssue);
	}
	
	/**
	 * Get critical issues
	 */
	getCriticalIssues(): CapturedConsoleMessage[] {
		return this.messages.filter(msg => 
			msg.detectedIssue && msg.detectedIssue.severity === 'critical'
		);
	}
	
	/**
	 * Generate a comprehensive console report
	 */
	generateReport(): ConsoleReport {
		const errors = this.getErrors();
		const warnings = this.getWarnings();
		const detectedIssues = this.getDetectedIssues();
		const criticalIssues = this.getCriticalIssues();
		
		return {
			summary: {
				totalMessages: this.messages.length,
				errorCount: errors.length,
				warningCount: warnings.length,
				detectedIssueCount: detectedIssues.length,
				criticalIssueCount: criticalIssues.length,
			},
			messages: this.messages,
			errors,
			warnings,
			detectedIssues,
			criticalIssues,
			recommendations: this.generateRecommendations(detectedIssues),
		};
	}
	
	/**
	 * Generate fix recommendations based on detected issues
	 */
	private generateRecommendations(issues: CapturedConsoleMessage[]): string[] {
		const recommendations = new Set<string>();
		
		for (const issue of issues) {
			if (issue.detectedIssue) {
				recommendations.add(issue.detectedIssue.suggestedFix);
			}
		}
		
		return Array.from(recommendations);
	}
	
	/**
	 * Clear all captured messages
	 */
	clear(): void {
		this.messages = [];
	}
}

/**
 * Type definitions
 */
interface CapturedConsoleMessage {
	type: string;
	text: string;
	location: {
		url: string;
		lineNumber: number;
		columnNumber: number;
	};
	timestamp: Date;
	args: string[];
	stack?: string;
	detectedIssue?: DetectedIssue;
}

interface DetectedIssue {
	pattern: string;
	severity: 'critical' | 'high' | 'medium' | 'low';
	category: 'wrapper' | 'svelte' | 'echarts' | 'obsidian' | 'ui' | 'general';
	description: string;
	suggestedFix: string;
}

interface ErrorPattern {
	pattern: RegExp;
	severity: 'critical' | 'high' | 'medium' | 'low';
	category: 'wrapper' | 'svelte' | 'echarts' | 'obsidian' | 'ui' | 'general';
	description: string;
	suggestedFix: string;
}

interface ConsoleReport {
	summary: {
		totalMessages: number;
		errorCount: number;
		warningCount: number;
		detectedIssueCount: number;
		criticalIssueCount: number;
	};
	messages: CapturedConsoleMessage[];
	errors: CapturedConsoleMessage[];
	warnings: CapturedConsoleMessage[];
	detectedIssues: CapturedConsoleMessage[];
	criticalIssues: CapturedConsoleMessage[];
	recommendations: string[];
}