import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helper for visual regression testing and screenshot management
 * Provides utilities for capturing and comparing visual elements
 */
export class VisualTestingHelper {
	constructor(private page: Page) {}
	
	/**
	 * Capture screenshot of chart container
	 */
	async captureChartScreenshot(name: string, options?: ScreenshotOptions): Promise<Buffer> {
		const chartContainer = this.page.locator('.chart-container');
		
		// Wait for chart to be stable
		await this.waitForChartStable();
		
		return await chartContainer.screenshot({
			path: `test-results/screenshots/${name}.png`,
			...options
		});
	}
	
	/**
	 * Compare chart with baseline image
	 */
	async compareChartWithBaseline(name: string, options?: ComparisonOptions): Promise<boolean> {
		const chartContainer = this.page.locator('.chart-container');
		
		// Wait for chart to be stable
		await this.waitForChartStable();
		
		try {
			await expect(chartContainer).toHaveScreenshot(`${name}-baseline.png`, {
				maxDiffPixels: options?.maxDiffPixels || 100,
				threshold: options?.threshold || 0.2,
				...options
			});
			return true;
		} catch (error) {
			console.error(`Visual regression detected for ${name}:`, error);
			return false;
		}
	}
	
	/**
	 * Capture screenshot of configuration panel
	 */
	async captureConfigPanelScreenshot(name: string): Promise<Buffer> {
		const panel = this.page.locator('.configuration-panel, .chart-config-panel, .config-panel');
		
		// Wait for panel to be visible and stable
		await panel.waitFor({ state: 'visible', timeout: 5000 });
		await this.page.waitForTimeout(200); // Allow for animations
		
		return await panel.screenshot({
			path: `test-results/screenshots/panel-${name}.png`
		});
	}
	
	/**
	 * Test responsive design across different viewport sizes
	 */
	async testResponsiveDesign(name: string): Promise<ResponsiveTestResult[]> {
		const viewports = [
			{ width: 1920, height: 1080, name: 'desktop-large' },
			{ width: 1280, height: 720, name: 'desktop' },
			{ width: 1024, height: 768, name: 'tablet' },
			{ width: 768, height: 1024, name: 'tablet-portrait' },
			{ width: 375, height: 667, name: 'mobile' },
		];
		
		const results: ResponsiveTestResult[] = [];
		
		for (const viewport of viewports) {
			console.log(`Testing responsive design: ${viewport.name} (${viewport.width}x${viewport.height})`);
			
			// Set viewport size
			await this.page.setViewportSize(viewport);
			
			// Wait for layout to adjust
			await this.page.waitForTimeout(500);
			await this.waitForChartStable();
			
			// Capture screenshot
			const screenshot = await this.captureChartScreenshot(`${name}-${viewport.name}`);
			
			// Check if chart is still visible and properly sized
			const chartContainer = this.page.locator('.chart-container');
			const isVisible = await chartContainer.isVisible();
			const boundingBox = await chartContainer.boundingBox();
			
			results.push({
				viewport: viewport.name,
				dimensions: viewport,
				isVisible,
				boundingBox,
				screenshotPath: `test-results/screenshots/${name}-${viewport.name}.png`,
			});
		}
		
		return results;
	}
	
	/**
	 * Test theme variations (light/dark mode)
	 */
	async testThemeVariations(name: string): Promise<ThemeTestResult[]> {
		const themes: ('light' | 'dark')[] = ['light', 'dark'];
		const results: ThemeTestResult[] = [];
		
		for (const theme of themes) {
			console.log(`Testing theme: ${theme}`);
			
			// Switch theme (implementation depends on how themes are handled)
			await this.switchTheme(theme);
			
			// Wait for theme to apply
			await this.page.waitForTimeout(500);
			await this.waitForChartStable();
			
			// Capture screenshot
			const screenshot = await this.captureChartScreenshot(`${name}-${theme}`);
			
			results.push({
				theme,
				screenshotPath: `test-results/screenshots/${name}-${theme}.png`,
			});
		}
		
		return results;
	}
	
	/**
	 * Capture full page screenshot
	 */
	async captureFullPageScreenshot(name: string): Promise<Buffer> {
		return await this.page.screenshot({
			path: `test-results/screenshots/fullpage-${name}.png`,
			fullPage: true
		});
	}
	
	/**
	 * Capture element screenshot with highlighting
	 */
	async captureElementWithHighlight(selector: string, name: string): Promise<Buffer> {
		const element = this.page.locator(selector);
		
		// Add highlight styling
		await element.evaluate((el) => {
			el.style.outline = '3px solid red';
			el.style.outlineOffset = '2px';
		});
		
		// Wait a moment for styling to apply
		await this.page.waitForTimeout(100);
		
		// Capture screenshot
		const screenshot = await element.screenshot({
			path: `test-results/screenshots/highlighted-${name}.png`
		});
		
		// Remove highlight styling
		await element.evaluate((el) => {
			el.style.outline = '';
			el.style.outlineOffset = '';
		});
		
		return screenshot;
	}
	
	/**
	 * Wait for chart to be stable (no animations or loading)
	 */
	private async waitForChartStable(): Promise<void> {
		const chartContainer = this.page.locator('.chart-container');
		
		// Wait for chart container to be visible
		await chartContainer.waitFor({ state: 'visible', timeout: 10000 });
		
		// Wait for canvas to be rendered
		await this.page.waitForFunction(() => {
			const canvas = document.querySelector('.chart-container canvas') as HTMLCanvasElement;
			return canvas && canvas.width > 0 && canvas.height > 0;
		}, { timeout: 10000 });
		
		// Wait for any loading indicators to disappear
		const loadingIndicator = this.page.locator('.loading, .spinner, .chart-loading');
		if (await loadingIndicator.isVisible().catch(() => false)) {
			await loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 });
		}
		
		// Wait for animations to complete
		await this.page.waitForTimeout(300);
	}
	
	/**
	 * Switch theme (implementation depends on app theme system)
	 */
	private async switchTheme(theme: 'light' | 'dark'): Promise<void> {
		// This is a placeholder implementation
		// In practice, this would depend on how Obsidian handles themes
		
		try {
			// Try to find theme toggle
			const themeToggle = this.page.locator('[data-testid="theme-toggle"], .theme-toggle');
			if (await themeToggle.isVisible().catch(() => false)) {
				await themeToggle.click();
				return;
			}
			
			// Try settings approach
			await this.page.keyboard.press('Meta+,'); // Open settings
			await this.page.click('text=Appearance');
			
			const themeOption = this.page.locator(`text=${theme === 'dark' ? 'Dark' : 'Light'}`);
			if (await themeOption.isVisible().catch(() => false)) {
				await themeOption.click();
			}
			
			await this.page.keyboard.press('Escape'); // Close settings
		} catch (error) {
			console.warn(`Could not switch to ${theme} theme:`, error);
		}
	}
}

/**
 * Type definitions
 */
interface ScreenshotOptions {
	maxDiffPixels?: number;
	threshold?: number;
	clip?: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	fullPage?: boolean;
	omitBackground?: boolean;
}

interface ComparisonOptions {
	maxDiffPixels?: number;
	threshold?: number;
	animations?: 'disabled' | 'allow';
}

interface ResponsiveTestResult {
	viewport: string;
	dimensions: {
		width: number;
		height: number;
		name: string;
	};
	isVisible: boolean;
	boundingBox: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null;
	screenshotPath: string;
}

interface ThemeTestResult {
	theme: string;
	screenshotPath: string;
}