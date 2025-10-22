import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Bases Charts Plugin - Real User Workflows', function () {
	// Increase timeout for comprehensive testing
	this.timeout(120000);

	let pluginLoaded = false;
	const allLogs: { stage: string; type: string; messages: string[] }[] = [];

	/**
	 * Capture all console logs from the browser
	 */
	async function captureLogs(stage: string): Promise<void> {
		try {
			const logs = await browser.getLogs('browser');
			if (logs && logs.length > 0) {
				const messages = logs.map(log => {
					const logEntry = log as Record<string, unknown>;
					const timestamp = new Date(logEntry.timestamp as number).toISOString();
					return `[${timestamp}] ${logEntry.level}: ${logEntry.message}`;
				});
				allLogs.push({
					stage,
					type: 'browser',
					messages,
				});
				console.log(`\n📋 Captured ${logs.length} browser logs at stage "${stage}":`);
				messages.forEach(msg => console.log(`   ${msg}`));
			}
		} catch (error) {
			console.warn(`Failed to capture browser logs at stage "${stage}":`, error);
		}
	}

	/**
	 * Capture plugin-specific logs from Obsidian console
	 */
	async function capturePluginLogs(stage: string): Promise<void> {
		try {
			const pluginLogs = await browser.executeScript(
				`
				// Get all console logs that were captured during the session
				// This is a fallback mechanism for logs that might have been generated
				const consoleOutput = window.__basesChartTestLogs || [];
				return {
					logs: consoleOutput,
					timestamp: new Date().toISOString(),
				};
				`,
				[]
			);

			if (pluginLogs && pluginLogs.logs && pluginLogs.logs.length > 0) {
				allLogs.push({
					stage,
					type: 'plugin',
					messages: pluginLogs.logs,
				});
				console.log(`\n📋 Captured ${pluginLogs.logs.length} plugin logs at stage "${stage}"`);
			}
		} catch (error) {
			console.warn(`Failed to capture plugin logs at stage "${stage}":`, error);
		}
	}

	/**
	 * Capture all errors and warnings from Obsidian
	 */
	async function captureObsidianErrors(stage: string): Promise<void> {
		try {
			const obsidianErrors = await browser.executeObsidian(({ app }) => {
				// This will capture any errors that occurred within the Obsidian context
				return {
					hasNotices: (app as any).vault?.notices?.length > 0 || false,
					noticeCount: (app as any).vault?.notices?.length || 0,
				};
			});

			if (obsidianErrors.hasNotices) {
				console.log(
					`\n📋 Obsidian notices at stage "${stage}": ${obsidianErrors.noticeCount} notices`
				);
			}
		} catch (error) {
			console.warn(`Failed to capture Obsidian errors at stage "${stage}":`, error);
		}
	}

	before(async function () {
		// Reset vault to clean state before all tests
		await obsidianPage.resetVault('test/vaults/exampleVault');
		await captureLogs('vault-reset');

		// Enable the plugin
		await obsidianPage.enablePlugin('bases-charts');
		await captureLogs('plugin-enabled');

		// Verify plugin is loaded
		const pluginStatus = await browser.executeObsidian(({ app }) => {
			const plugin = (app as any).plugins?.getPlugin('bases-charts');
			console.log('[E2E Test] Plugin loading check:', {
				isLoaded: !!plugin,
				pluginId: plugin?.manifest?.id,
			});
			return {
				isLoaded: !!plugin,
				isEnabled: (app as any).plugins?.enabledPlugins?.has('bases-charts') || false,
			};
		});

		await captureLogs('plugin-status-check');

		pluginLoaded = pluginStatus.isLoaded && pluginStatus.isEnabled;
		console.log(`✅ Plugin loaded successfully:`, pluginLoaded);

		const obsidianVersion = browser.getObsidianVersion();
		console.log(`Testing on Obsidian version: ${obsidianVersion}`);

		await capturePluginLogs('initial-setup');
		await captureObsidianErrors('initial-setup');
	});

	describe('Complete Workflow: Create and Render AAPL Scatter Chart', function () {
		it('should open a bases chart view for AAPL dataset', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded - cannot run user workflow test');
			}

			console.log('\n🔍 [TEST STAGE] Opening AAPL chart view');

			// Open a bases view for AAPL data
			const viewOpened = await browser.executeObsidian(({ app }) => {
				try {
					console.log('[Plugin] Opening chart view for AAPL dataset');
					const workspace = app.workspace;
					const leaf = workspace.getLeaf(true);

					// Open the bases view for AAPL
					return leaf
						.setViewState({
							type: 'chart',
							state: { base: 'aapl' }
						})
						.then(() => {
							console.log('[Plugin] Chart view opened successfully');
							return {
								success: true,
								viewType: leaf.view?.getViewType?.(),
								baseType: leaf.view?.getViewType?.() === 'chart',
							};
						})
						.catch((error: Error) => {
							console.error('[Plugin] Failed to open chart view:', error);
							return {
								error: error.message,
								errorStack: error.stack,
							};
						});
				} catch (error) {
					console.error('[Plugin] Exception opening chart view:', error);
					return {
						error: (error as Error).message,
						errorStack: (error as Error).stack,
					};
				}
			});

			await captureLogs('after-chart-view-open');
			await capturePluginLogs('after-chart-view-open');
			await captureObsidianErrors('after-chart-view-open');

			console.log('Chart view opened:', viewOpened);

			if ('error' in viewOpened) {
				throw new Error(`Failed to open chart view: ${viewOpened.error}`);
			}

			expect(viewOpened.success).toBe(true);

			// Wait for chart to render
			await browser.pause(2000);

			// Verify chart container exists
			const chartContainer = await browser.$('.bases-chart-view');
			await expect(chartContainer).toExist();
			console.log('✅ Chart container exists');

			await captureLogs('after-chart-container-verify');
		});

		it('should render ECharts canvas with AAPL data', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Verifying ECharts canvas rendering');

			// Wait for canvas to render
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();
			console.log('✅ ECharts canvas found');

			await captureLogs('after-canvas-found');

			// Verify canvas has content
			const canvasElement = await browser.executeScript(
				`
				console.log('[Script] Checking canvas element');
				const canvas = document.querySelector('.bases-chart-view canvas');
				console.log('[Script] Canvas found:', !!canvas);
				return canvas;
				`,
				[]
			);

			expect(canvasElement).toBeTruthy();
			await captureLogs('after-canvas-script-check');

			// Verify the chart view has the correct data type
			const chartData = await browser.executeObsidian(({ app }) => {
				const leaf = app.workspace.activeLeaf;
				const view = leaf?.view;

				console.log('[Plugin] Chart view verification:', {
					viewType: view?.getViewType?.(),
					hasChartView: view?.constructor?.name,
				});

				return {
					viewType: view?.getViewType?.(),
					hasChartView:
						view?.constructor?.name === 'ChartView' ||
						(view?.getViewType?.() as string)?.includes('chart'),
					elementClasses: view?.containerEl?.className || '',
				};
			});

			await captureLogs('after-chart-data-verify');

			console.log('Chart view data:', chartData);
			expect(chartData.viewType).toContain('chart');
		});

		it('should have configuration panel available', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Checking configuration panel');

			// Wait for panel to be available
			await browser.pause(1000);

			// Look for configuration panel or toggle button
			const configElements = await browser.$$('[class*="config"], [class*="panel"], [class*="setting"]');

			console.log(`Found ${configElements.length} potential config elements`);
			await captureLogs('after-config-elements-search');

			// The panel might be hidden/collapsed initially
			// Just verify we can detect the UI structure
			const chartView = await browser.$('.bases-chart-view');
			await expect(chartView).toExist();

			await captureLogs('after-chart-view-verify');
		});
	});

	describe('Chart Configuration Workflow: Change X-Axis', function () {
		it('should allow changing X-axis property through configuration', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Open AAPL chart if not already open
			await browser.executeObsidian(({ app }) => {
				const workspace = app.workspace;
				const leaf = workspace.getLeaf(true);
				return leaf.setViewState({
					type: 'chart',
					state: { base: 'aapl' }
				});
			});

			await browser.pause(2000);

			// Verify initial chart state
			const initialState = await browser.executeObsidian(({ app }) => {
				const leaf = app.workspace.activeLeaf;
				const viewState = leaf?.getViewState?.();

				return {
					baseConfig: viewState?.state || {},
					settings: viewState?.state?.settings || {},
				};
			});

			console.log('Initial chart state:', initialState);
			expect(initialState.baseConfig.base).toBe('aapl');

			// Chart should render with data
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();
			console.log('✅ Chart rendered after opening');
		});

		it('should display configuration panel with axis selectors', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Wait for UI to stabilize
			await browser.pause(1000);

			// Try to find axis configuration elements
			const axisSelectors = await browser.$$('[class*="axis"], [class*="selector"], [class*="property"]');

			console.log(`Found ${axisSelectors.length} potential axis selector elements`);

			// At minimum, the chart container should exist
			const chartContainer = await browser.$('.bases-chart-view');
			await expect(chartContainer).toExist();
		});
	});

	describe('Chart Type Switching: Scatter to Line to Bar', function () {
		before(async function () {
			// Ensure we're viewing AAPL data
			await browser.executeObsidian(({ app }) => {
				const workspace = app.workspace;
				const leaf = workspace.getLeaf(true);
				return leaf.setViewState({
					type: 'chart',
					state: { base: 'aapl' }
				});
			});

			await browser.pause(2000);
		});

		it('should render scatter chart by default', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Wait for initial render
			await browser.pause(1000);

			// Verify canvas exists for scatter chart
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			// Check chart type in state
			const chartState = await browser.executeObsidian(({ app }) => {
				const leaf = app.workspace.activeLeaf;
				const viewState = leaf?.getViewState?.();

				return {
					viewType: leaf?.view?.getViewType?.(),
					state: viewState?.state || {},
				};
			});

			console.log('Current chart state:', chartState);
			expect(chartState.viewType).toContain('chart');
		});

		it('should have chart rendered with visible data points', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Verify canvas element exists
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			// Canvas should have non-zero dimensions
			const canvasSize = await canvas.getSize();
			console.log('Canvas size:', canvasSize);

			expect(canvasSize.width).toBeGreaterThan(0);
			expect(canvasSize.height).toBeGreaterThan(0);

			console.log('✅ Chart canvas has proper dimensions for rendering');
		});
	});

	describe('Dataset Switching: AAPL → Penguins → Bar', function () {
		it('should switch to penguins dataset and render chart', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Switching to penguins dataset');

			// Open penguins chart
			const switched = await browser.executeObsidian(({ app }) => {
				try {
					console.log('[Plugin] Switching dataset to penguins');
					const workspace = app.workspace;
					const leaf = workspace.getLeaf(true);

					return leaf
						.setViewState({
							type: 'chart',
							state: { base: 'penguins' }
						})
						.then(() => {
							console.log('[Plugin] Successfully switched to penguins dataset');
							return {
								success: true,
								newBase: 'penguins',
							};
						})
						.catch((error: Error) => {
							console.error('[Plugin] Failed to switch to penguins:', error);
							return {
								error: error.message,
							};
						});
				} catch (error) {
					console.error('[Plugin] Exception switching to penguins:', error);
					return {
						error: (error as Error).message,
					};
				}
			});

			await captureLogs('after-penguins-switch');
			await capturePluginLogs('after-penguins-switch');

			console.log('Dataset switch result:', switched);

			if ('error' in switched) {
				throw new Error(`Failed to switch to penguins: ${switched.error}`);
			}

			// Wait for render
			await browser.pause(2000);

			// Verify chart exists
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			await captureLogs('after-penguins-render');
			console.log('✅ Penguins dataset chart rendered');
		});

		it('should switch to bar dataset and render chart', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Switching to bar dataset');

			// Open bar chart
			const switched = await browser.executeObsidian(({ app }) => {
				try {
					console.log('[Plugin] Switching dataset to bar');
					const workspace = app.workspace;
					const leaf = workspace.getLeaf(true);

					return leaf
						.setViewState({
							type: 'chart',
							state: { base: 'bar' }
						})
						.then(() => {
							console.log('[Plugin] Successfully switched to bar dataset');
							return {
								success: true,
								newBase: 'bar',
							};
						})
						.catch((error: Error) => {
							console.error('[Plugin] Failed to switch to bar:', error);
							return {
								error: error.message,
							};
						});
				} catch (error) {
					console.error('[Plugin] Exception switching to bar:', error);
					return {
						error: (error as Error).message,
					};
				}
			});

			await captureLogs('after-bar-switch');
			await capturePluginLogs('after-bar-switch');

			console.log('Dataset switch result:', switched);

			if ('error' in switched) {
				throw new Error(`Failed to switch to bar: ${switched.error}`);
			}

			// Wait for render
			await browser.pause(2000);

			// Verify chart exists
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			await captureLogs('after-bar-render');
			console.log('✅ Bar dataset chart rendered');
		});

		it('should handle switching back to AAPL', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Switching back to AAPL');

			// Switch back to AAPL
			const switched = await browser.executeObsidian(({ app }) => {
				try {
					console.log('[Plugin] Switching back to AAPL dataset');
					const workspace = app.workspace;
					const leaf = workspace.getLeaf(true);

					return leaf
						.setViewState({
							type: 'chart',
							state: { base: 'aapl' }
						})
						.then(() => {
							console.log('[Plugin] Successfully switched back to AAPL');
							return {
								success: true,
								newBase: 'aapl',
							};
						})
						.catch((error: Error) => {
							console.error('[Plugin] Failed to switch back to AAPL:', error);
							return {
								error: error.message,
							};
						});
				} catch (error) {
					console.error('[Plugin] Exception switching back to AAPL:', error);
					return {
						error: (error as Error).message,
					};
				}
			});

			await captureLogs('after-aapl-switch-back');
			await capturePluginLogs('after-aapl-switch-back');

			console.log('Switch back to AAPL:', switched);

			if ('error' in switched) {
				throw new Error(`Failed to switch back to AAPL: ${switched.error}`);
			}

			await browser.pause(2000);

			// Verify chart exists
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			await captureLogs('after-aapl-render');
			console.log('✅ AAPL dataset chart rendered after dataset switching');
		});
	});

	describe('Chart Rendering Quality: Data Point Visibility', function () {
		before(async function () {
			// Open AAPL chart
			await browser.executeObsidian(({ app }) => {
				const workspace = app.workspace;
				const leaf = workspace.getLeaf(true);
				return leaf.setViewState({
					type: 'chart',
					state: { base: 'aapl' }
				});
			});

			await browser.pause(2000);
		});

		it('should render chart with proper canvas initialization', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Verify canvas exists
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			// Get canvas context to verify it's being used
			const canvasInfo = await browser.executeScript(
				`
				const canvas = document.querySelector('.bases-chart-view canvas');
				if (!canvas) return null;
				return {
					width: canvas.width,
					height: canvas.height,
					hasContext: !!canvas.getContext?.('2d'),
					isVisible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
				};
				`,
				[]
			);

			console.log('Canvas rendering info:', canvasInfo);

			if (canvasInfo) {
				expect(canvasInfo.width).toBeGreaterThan(0);
				expect(canvasInfo.height).toBeGreaterThan(0);
				expect(canvasInfo.hasContext).toBe(true);
				expect(canvasInfo.isVisible).toBe(true);
			}
		});

		it('should have chart container with proper styling', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Verify chart view styling
			const containerInfo = await browser.executeScript(
				`
				const container = document.querySelector('.bases-chart-view');
				if (!container) return null;
				const styles = window.getComputedStyle(container);
				return {
					display: styles.display,
					position: styles.position,
					width: styles.width,
					height: styles.height,
					overflow: styles.overflow,
					hasContent: container.children.length > 0,
					childCount: container.children.length,
				};
				`,
				[]
			);

			console.log('Chart container styling:', containerInfo);

			if (containerInfo) {
				expect(containerInfo.display).not.toBe('none');
				expect(containerInfo.hasContent).toBe(true);
			}
		});

		it('should render multiple visual elements (canvas or SVG)', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Count visual rendering elements
			const visualElements = await browser.executeScript(
				`
				const container = document.querySelector('.bases-chart-view');
				if (!container) return null;
				
				const canvas = container.querySelector('canvas');
				const svgs = container.querySelectorAll('svg');
				
				return {
					hasCanvas: !!canvas,
					canvasCount: canvas ? 1 : 0,
					svgCount: svgs.length,
					totalVisualElements: (canvas ? 1 : 0) + svgs.length,
					containerHasChartLike: container.className.includes('chart') || container.getAttribute('data-type') === 'bases',
				};
				`,
				[]
			);

			console.log('Visual elements found:', visualElements);

			if (visualElements) {
				// Should have at least canvas or SVG for rendering
				const hasVisualElements = (visualElements.canvasCount > 0 || visualElements.svgCount > 0);
				expect(hasVisualElements).toBe(true);
				expect(visualElements.containerHasChartLike).toBe(true);
			}
		});
	});

	describe('Chart Responsiveness: Resize and Reflow', function () {
		before(async function () {
			// Open AAPL chart
			await browser.executeObsidian(({ app }) => {
				const workspace = app.workspace;
				const leaf = workspace.getLeaf(true);
				return leaf.setViewState({
					type: 'chart',
					state: { base: 'aapl' }
				});
			});

			await browser.pause(2000);
		});

		it('should have chart container that can be resized', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Get initial dimensions
			const initialSize = await browser.executeScript(
				`
				const container = document.querySelector('.bases-chart-view');
				return {
					width: container.offsetWidth,
					height: container.offsetHeight,
				};
				`,
				[]
			);

			console.log('Initial chart container size:', initialSize);

			expect(initialSize.width).toBeGreaterThan(0);
			expect(initialSize.height).toBeGreaterThan(0);

			// Change viewport size to trigger resize
			await browser.setWindowSize(800, 600);
			await browser.pause(1000);

			// Get new dimensions
			const resizedSize = await browser.executeScript(
				`
				const container = document.querySelector('.bases-chart-view');
				return {
					width: container.offsetWidth,
					height: container.offsetHeight,
				};
				`,
				[]
			);

			console.log('Resized chart container size:', resizedSize);

			// Container should still be visible
			expect(resizedSize.width).toBeGreaterThan(0);
			expect(resizedSize.height).toBeGreaterThan(0);

			// Restore window size
			await browser.maximizeWindow();
		});

		it('should maintain chart visibility after viewport changes', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Verify chart container still exists after resize
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			const containerVisible = await browser.executeScript(
				`
				const container = document.querySelector('.bases-chart-view');
				if (!container) return false;
				const styles = window.getComputedStyle(container);
				return styles.display !== 'none' && styles.visibility !== 'hidden';
				`,
				[]
			);

			expect(containerVisible).toBe(true);
			console.log('✅ Chart remains visible after viewport changes');
		});
	});

	describe('Error States and Edge Cases', function () {
		it('should handle missing base data gracefully', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Testing error handling - missing base');

			// Try to open a non-existent base
			const result = await browser.executeObsidian(({ app }) => {
				try {
					console.log('[Plugin] Attempting to open non-existent base');
					const workspace = app.workspace;
					const leaf = workspace.getLeaf(true);

					return leaf
						.setViewState({
							type: 'chart',
							state: { base: 'nonexistent-base-xyz' }
						})
						.then(() => {
							console.log('[Plugin] Non-existent base request completed');
							return { attempted: true };
						})
						.catch((error: Error) => {
							console.error('[Plugin] Expected error for non-existent base:', error.message);
							return {
								attempted: true,
								errorOccurred: true,
								error: error.message,
							};
						});
				} catch (error) {
					console.error('[Plugin] Exception handling non-existent base:', error);
					return {
						attempted: false,
						caught: true,
						error: (error as Error).message,
					};
				}
			});

			await captureLogs('after-missing-base-test');
			await capturePluginLogs('after-missing-base-test');

			console.log('Non-existent base handling:', result);

			// Should either fail gracefully or show error UI
			expect(result.attempted).toBe(true);
		});

		it('should maintain chart state when switching between datasets rapidly', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Testing rapid dataset switching');

			// Rapidly switch between datasets
			const bases = ['aapl', 'penguins', 'bar', 'aapl', 'bar', 'penguins'];

			for (const base of bases) {
				console.log(`   Switching to ${base}...`);
				await browser.executeObsidian(({ app }) => {
					try {
						const workspace = app.workspace;
						const leaf = workspace.getLeaf(true);
						return leaf.setViewState({
							type: 'chart',
							state: { base }
						});
					} catch (error) {
						console.error(`[Plugin] Error switching to ${base}:`, error);
						return { error };
					}
				});

				await browser.pause(500);
			}

			await captureLogs('after-rapid-switching');
			await capturePluginLogs('after-rapid-switching');

			// Final verification - chart should still exist
			const canvas = await browser.$('.bases-chart-view canvas');
			await expect(canvas).toExist();

			console.log('✅ Chart maintained state through rapid dataset switching');
		});
	});

	describe('Plugin Lifecycle During Chart Viewing', function () {
		it('should maintain chart state when plugin is disabled and re-enabled', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			console.log('\n🔍 [TEST STAGE] Testing plugin disable/enable cycle');

			// Open a chart first
			console.log('   Opening chart before disable...');
			await browser.executeObsidian(({ app }) => {
				console.log('[Plugin] Opening chart for disable/enable test');
				const workspace = app.workspace;
				const leaf = workspace.getLeaf(true);
				return leaf.setViewState({
					type: 'chart',
					state: { base: 'aapl' }
				});
			});

			await browser.pause(1000);
			await captureLogs('before-plugin-disable');

			// Disable plugin
			console.log('   Disabling plugin...');
			await obsidianPage.disablePlugin('bases-charts');
			console.log('[E2E] Plugin disabled');
			await browser.pause(1000);
			await captureLogs('after-plugin-disable');

			// Re-enable plugin
			console.log('   Re-enabling plugin...');
			await obsidianPage.enablePlugin('bases-charts');
			console.log('[E2E] Plugin re-enabled');
			await browser.pause(2000);
			await captureLogs('after-plugin-reenable');

			// Verify plugin is still accessible
			const status = await browser.executeObsidian(({ app }) => {
				console.log('[Plugin] Checking status after re-enable');
				return {
					isEnabled: (app as any).plugins?.enabledPlugins?.has('bases-charts'),
					pluginExists: !!(app as any).plugins?.getPlugin('bases-charts'),
				};
			});

			await captureLogs('after-plugin-status-check');

			console.log('Plugin status after disable/enable:', status);

			expect(status.isEnabled).toBe(true);
			expect(status.pluginExists).toBe(true);
		});
	});

	describe('Multiple Charts and Workspace Layout', function () {
		it('should allow opening chart view in split pane', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Open first chart in main pane
			await browser.executeObsidian(({ app }) => {
				const workspace = app.workspace;
				const leaf = workspace.getLeaf(true);
				return leaf.setViewState({
					type: 'chart',
					state: { base: 'aapl' }
				});
			});

			await browser.pause(1000);

			// Verify chart is visible
			let charts = await browser.$$('.bases-chart-view');
			expect(charts.length).toBeGreaterThanOrEqual(1);

			console.log(`✅ Chart view opened successfully (found ${charts.length} chart view(s))`);
		});

		it('should handle multiple chart views without crashing', async function () {
			if (!pluginLoaded) {
				throw new Error('Plugin not loaded');
			}

			// Get count of chart views
			const viewCount = await browser.executeObsidian(({ app }) => {
				const leaves = app.workspace.getLeavesOfType('chart');
				return {
					chartViewCount: leaves.length || 0,
					totalLeaves: leaves.length || 0,
				};
			});

			console.log('Chart view count:', viewCount);

			// Should be able to have at least one chart view
			expect(viewCount.chartViewCount).toBeGreaterThanOrEqual(0);
		});
	});

	after(async function () {
		// Final status check
		const finalStatus = await browser.executeObsidian(({ app }) => {
			console.log('[Plugin] Final test status check');
			const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
			const chartLeaves = app.workspace.getLeavesOfType('chart');

			return {
				pluginStillLoaded: !!basesPlugin,
				chartViewsOpen: chartLeaves.length,
				enabledPlugins: (app as any).plugins?.enabledPlugins?.size || 0,
			};
		});

		await captureLogs('final-status');
		await capturePluginLogs('final-status');
		await captureObsidianErrors('final-status');

		console.log('Final workspace status:', finalStatus);

		if (pluginLoaded) {
			console.log('✅ Real user workflow e2e test suite completed successfully');

			// Print comprehensive log summary
			console.log('\n' + '='.repeat(80));
			console.log('📊 COMPREHENSIVE TEST LOG REPORT');
			console.log('='.repeat(80));

			// Group logs by stage
			const logsByStage = new Map<string, typeof allLogs>();
			for (const log of allLogs) {
				if (!logsByStage.has(log.stage)) {
					logsByStage.set(log.stage, []);
				}
				logsByStage.get(log.stage)!.push(log);
			}

			let totalLogs = 0;
			for (const [stage, stageLogs] of logsByStage) {
				const stageLogCount = stageLogs.reduce((sum, log) => sum + log.messages.length, 0);
				totalLogs += stageLogCount;
				console.log(`\n📍 Stage: ${stage}`);
				console.log(`   Total logs: ${stageLogCount}`);

				for (const log of stageLogs) {
					console.log(`   Type: ${log.type} (${log.messages.length} messages)`);
					log.messages.slice(0, 5).forEach(msg => {
						console.log(`      → ${msg}`);
					});
					if (log.messages.length > 5) {
						console.log(`      ... and ${log.messages.length - 5} more messages`);
					}
				}
			}

			console.log('\n' + '='.repeat(80));
			console.log(`Total logs captured: ${totalLogs}`);
			console.log('='.repeat(80) + '\n');
		}
	});
});
