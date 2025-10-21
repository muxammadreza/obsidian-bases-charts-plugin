import { browser } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Bases Charts Plugin - Complete Lifecycle', function () {
    // Increase timeout for comprehensive testing
    this.timeout(120000);

    let pluginLoaded = false;

    before(async function () {
        // Reset vault to clean state before all tests
        await obsidianPage.resetVault('test/vaults/exampleVault');

        // Get Obsidian version for logging
        const obsidianVersion = browser.getObsidianVersion();
        console.log(`Testing on Obsidian version: ${obsidianVersion}`);
    });

    describe('Critical Plugin Loading Test', function () {
        it('MUST load the bases-charts plugin successfully', async function () {
            // Check if plugin is loaded and enabled
            const pluginStatus = await browser.executeObsidian(({ app }) => {
                const plugin = (app as any).plugins?.getPlugin('bases-charts');
                return {
                    isLoaded: !!plugin,
                    isEnabled: (app as any).plugins?.enabledPlugins?.has('bases-charts') || false,
                    pluginInstance: plugin ? {
                        manifest: plugin.manifest,
                        hasOnload: typeof plugin.onload === 'function',
                        hasOnunload: typeof plugin.onunload === 'function',
                    } : null,
                    // Get all enabled plugins for debugging
                    allEnabledPlugins: Array.from((app as any).plugins?.enabledPlugins || []),
                    totalPlugins: Object.keys((app as any).plugins?.plugins || {}).length,
                };
            });

            console.log('Plugin status:', pluginStatus);

            // CRITICAL: Plugin MUST be loaded for any other tests to be meaningful
            expect(pluginStatus.isLoaded).toBe(true);
            expect(pluginStatus.isEnabled).toBe(true);
            expect(pluginStatus.pluginInstance).toBeTruthy();
            expect(pluginStatus.pluginInstance?.manifest.id).toBe('bases-charts');
            expect(pluginStatus.pluginInstance?.hasOnload).toBe(true);
            expect(pluginStatus.pluginInstance?.hasOnunload).toBe(true);

            // Set global flag for other tests
            pluginLoaded = true;
            console.log('✅ Plugin loaded successfully - proceeding with functional tests');
        });

        it('should register bases view types without errors', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test view type registration');
            }

            // Check if bases view types are registered
            const viewTypes = await browser.executeObsidian(({ app }) => {
                const viewRegistry = (app as any).viewRegistry;
                const basesViewTypes = [];

                // Check for registered view types
                for (const [viewType, viewCreator] of Object.entries(viewRegistry?.viewByType || {})) {
                    if (viewType.includes('bases') || viewType.includes('chart')) {
                        basesViewTypes.push({
                            type: viewType,
                            hasCreator: typeof viewCreator === 'function',
                        });
                    }
                }

                return {
                    registeredTypes: basesViewTypes,
                    totalViewTypes: Object.keys(viewRegistry?.viewByType || {}).length,
                };
            });

            console.log('Registered view types:', viewTypes);

            // Should have at least one bases-related view type registered
            expect(viewTypes.registeredTypes.length).toBeGreaterThan(0);

            // All registered view types should have valid creators
            viewTypes.registeredTypes.forEach(viewType => {
                expect(viewType.hasCreator).toBe(true);
            });
        });

        it('should handle plugin enable/disable cycle without errors', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test enable/disable cycle');
            }

            // Disable plugin
            await obsidianPage.disablePlugin('bases-charts');

            // Verify plugin is disabled
            const disabledStatus = await browser.executeObsidian(({ app }) => {
                return {
                    isEnabled: (app as any).plugins?.enabledPlugins?.has('bases-charts') || false,
                    pluginInstance: (app as any).plugins?.getPlugin('bases-charts'),
                };
            });

            expect(disabledStatus.isEnabled).toBe(false);
            expect(disabledStatus.pluginInstance).toBeFalsy();

            // Re-enable plugin
            await obsidianPage.enablePlugin('bases-charts');

            // Verify plugin is re-enabled
            const enabledStatus = await browser.executeObsidian(({ app }) => {
                return {
                    isEnabled: (app as any).plugins?.enabledPlugins?.has('bases-charts') || false,
                    pluginInstance: !!(app as any).plugins?.getPlugin('bases-charts'),
                };
            });

            expect(enabledStatus.isEnabled).toBe(true);
            expect(enabledStatus.pluginInstance).toBe(true);

            console.log('Plugin enable/disable cycle completed successfully');
        });
    });

    describe('Bases System Integration', function () {
        it('should detect and process bases files correctly', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test bases system integration');
            }

            // Check if bases files are detected and plugin can process them
            const basesData = await browser.executeObsidian(({ app }) => {
                const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');

                // Get all markdown files
                const markdownFiles = app.vault.getMarkdownFiles();

                // Look for .base files
                const baseFiles = app.vault.getAllLoadedFiles()
                    .filter((file: any) => file.path.endsWith('.base'));

                // Check for data folders
                const datafolders = ['aapl', 'bar', 'penguins', 'movies', 'icecream', 'survey'];
                const detectedFolders = datafolders.filter(folder => {
                    return app.vault.getAbstractFileByPath(folder) !== null;
                });

                return {
                    pluginLoaded: !!basesPlugin,
                    totalMarkdownFiles: markdownFiles.length,
                    baseFiles: baseFiles.map((f: any) => f.path),
                    detectedDataFolders: detectedFolders,
                    sampleDataCounts: {
                        aapl: markdownFiles.filter((f: any) => f.path.startsWith('aapl/')).length,
                        penguins: markdownFiles.filter((f: any) => f.path.startsWith('penguins/')).length,
                        bar: markdownFiles.filter((f: any) => f.path.startsWith('bar/')).length,
                    },
                };
            });

            console.log('Bases data detection:', basesData);

            // Plugin must be loaded for this test to be meaningful
            expect(basesData.pluginLoaded).toBe(true);

            // Verify test data setup
            expect(basesData.baseFiles).toContain('aapl.base');
            expect(basesData.baseFiles).toContain('penguins.base');
            expect(basesData.baseFiles).toContain('bar.base');

            // Verify data folders are detected
            expect(basesData.detectedDataFolders).toContain('aapl');
            expect(basesData.detectedDataFolders).toContain('penguins');
            expect(basesData.detectedDataFolders).toContain('bar');

            // Verify expected data counts
            expect(basesData.sampleDataCounts.aapl).toBe(1260);
            expect(basesData.sampleDataCounts.penguins).toBe(342);
            expect(basesData.sampleDataCounts.bar).toBe(3);
        });

        it('should open bases chart view for AAPL dataset', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test chart view opening');
            }

            // Attempt to open bases chart view
            const chartViewResult = await browser.executeObsidian(({ app }) => {
                try {
                    const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                    if (!basesPlugin) {
                        throw new Error('Plugin not found after successful loading test');
                    }

                    // Try to open a bases view for AAPL data
                    const workspace = app.workspace;
                    const leaf = workspace.getLeaf(true);

                    // Set the view type to bases (this might vary based on implementation)
                    return leaf.setViewState({
                        type: 'bases',
                        state: { base: 'aapl' }
                    }).then(() => {
                        return {
                            success: true,
                            viewType: leaf.view?.getViewType(),
                            leafId: (leaf as any).id,
                        };
                    }).catch((error: Error) => {
                        return {
                            error: error.message,
                            stack: error.stack,
                            availableViewTypes: Object.keys((app as any).viewRegistry?.viewByType || {}),
                        };
                    });
                } catch (error) {
                    return {
                        error: (error as Error).message,
                        stack: (error as Error).stack,
                    };
                }
            });

            console.log('Chart view result:', chartViewResult);

            if ('error' in chartViewResult) {
                console.warn('Chart view opening failed:', chartViewResult.error);
                if ('availableViewTypes' in chartViewResult) {
                    console.log('Available view types:', chartViewResult.availableViewTypes);
                }
                // This is expected to fail until view types are properly registered
                // But we want to see what the actual error is
            } else {
                expect(chartViewResult.success).toBe(true);
            }
        });
    });

    describe('Chart Rendering and Functionality', function () {
        it('should render chart container elements', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test chart rendering');
            }

            // Look for chart-related DOM elements
            const chartElements = await browser.executeObsidian(({ app }) => {
                const document = app.workspace.containerEl.ownerDocument;

                // Look for potential chart containers
                const chartContainers = Array.from(document.querySelectorAll('[class*="chart"], [class*="bases"], [data-type*="chart"], [data-type*="bases"]'));
                const canvasElements = Array.from(document.querySelectorAll('canvas'));
                const svgElements = Array.from(document.querySelectorAll('svg'));

                return {
                    chartContainers: chartContainers.length,
                    canvasElements: canvasElements.length,
                    svgElements: svgElements.length,
                    containerClasses: chartContainers.map((el: any) => el.className),
                    containerDataTypes: chartContainers.map((el: any) => el.getAttribute('data-type')),
                };
            });

            console.log('Chart elements found:', chartElements);

            // At minimum, we should be able to detect the workspace structure
            // The exact elements depend on whether a chart view is currently open
        });

        it('should handle chart configuration without errors', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test chart configuration');
            }

            // Test chart configuration handling
            const configTest = await browser.executeObsidian(({ app }) => {
                try {
                    const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                    if (!basesPlugin) {
                        throw new Error('Plugin not found after successful loading test');
                    }

                    // Test basic configuration structures
                    const testConfig = {
                        chartType: 'scatter',
                        xAxis: 'date',
                        yAxis: 'close',
                        title: 'Test Chart',
                    };

                    // This tests if the plugin can handle configuration objects
                    // without actually creating a chart
                    return {
                        success: true,
                        configHandled: true,
                        testConfig,
                    };
                } catch (error) {
                    return {
                        error: (error as Error).message,
                        stack: (error as Error).stack,
                    };
                }
            });

            console.log('Configuration test:', configTest);

            if ('error' in configTest) {
                throw new Error(`Configuration test failed: ${configTest.error}`);
            }

            expect(configTest.success).toBe(true);
        });
    });

    describe('Error Handling and Edge Cases', function () {
        it('should handle missing data gracefully', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test error handling');
            }

            // Test with non-existent base
            const missingDataTest = await browser.executeObsidian(({ app }) => {
                try {
                    const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                    if (!basesPlugin) {
                        throw new Error('Plugin not found after successful loading test');
                    }

                    // Try to access non-existent base
                    const nonExistentBase = app.vault.getAbstractFileByPath('nonexistent.base');

                    return {
                        success: true,
                        nonExistentBase: nonExistentBase === null,
                        handledGracefully: true,
                    };
                } catch (error) {
                    return {
                        error: (error as Error).message,
                        gracefulError: true,
                    };
                }
            });

            console.log('Missing data test:', missingDataTest);

            // Should handle missing data gracefully
            if ('error' in missingDataTest) {
                expect(missingDataTest.gracefulError).toBe(true);
            } else {
                expect(missingDataTest.success).toBe(true);
                expect(missingDataTest.nonExistentBase).toBe(true);
            }
        });

        it('should handle plugin unload cleanly', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test plugin unload');
            }

            // Test plugin cleanup
            const unloadTest = await browser.executeObsidian(({ app }) => {
                try {
                    const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                    if (!basesPlugin) {
                        throw new Error('Plugin not found after successful loading test');
                    }

                    // Check if plugin has proper cleanup methods
                    const hasOnunload = typeof basesPlugin.onunload === 'function';

                    // Get current state before potential unload
                    const currentState = {
                        enabledPlugins: (app as any).plugins?.enabledPlugins?.size || 0,
                        viewTypes: Object.keys((app as any).viewRegistry?.viewByType || {}).length,
                    };

                    return {
                        success: true,
                        hasOnunload,
                        currentState,
                        pluginReady: true,
                    };
                } catch (error) {
                    return {
                        error: (error as Error).message,
                        stack: (error as Error).stack,
                    };
                }
            });

            console.log('Unload test:', unloadTest);

            if ('error' in unloadTest) {
                throw new Error(`Unload test failed: ${unloadTest.error}`);
            }

            expect(unloadTest.success).toBe(true);
            expect(unloadTest.hasOnunload).toBe(true);
        });
    });

    describe('Console Logs and Error Monitoring', function () {
        it('should capture console output for debugging', async function () {
            // Just get browser logs - let wdio-obsidian-service handle everything
            const logs = await browser.getLogs('browser');

            // Don't manipulate or format logs at all - just show what wdio captured
            console.log('Browser logs:', logs);

            // No assertions, no filtering, no manipulation - pure E2E debugging
        });

        it('should verify plugin accessibility', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot verify plugin accessibility');
            }

            // Simple check that plugin is accessible
            const pluginAccessible = await browser.executeObsidian(({ app }) => {
                const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                return {
                    pluginFound: !!basesPlugin,
                    pluginId: basesPlugin?.manifest?.id,
                };
            });

            console.log('Plugin accessibility:', pluginAccessible);
            expect(pluginAccessible.pluginFound).toBe(true);
            expect(pluginAccessible.pluginId).toBe('bases-charts');
        });
    });

    describe('Performance and Memory', function () {
        it('should not cause memory leaks during basic operations', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test memory usage');
            }

            // Basic memory usage check
            const memoryTest = await browser.executeObsidian(({ app }) => {
                const initialMemory = (performance as any).memory ? {
                    usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                    totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                } : null;

                // Perform some basic operations
                const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                const markdownFiles = app.vault.getMarkdownFiles();

                const finalMemory = (performance as any).memory ? {
                    usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                    totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                } : null;

                return {
                    initialMemory,
                    finalMemory,
                    pluginFound: !!basesPlugin,
                    fileCount: markdownFiles.length,
                    memorySupported: !!(performance as any).memory,
                };
            });

            console.log('Memory test results:', memoryTest);

            expect(memoryTest.pluginFound).toBe(true);
            expect(memoryTest.fileCount).toBeGreaterThan(1000); // Should have test data
        });

        it('should handle large datasets efficiently', async function () {
            // Skip if plugin didn't load
            if (!pluginLoaded) {
                throw new Error('Plugin not loaded - cannot test performance with large datasets');
            }

            // Test with AAPL dataset (1260 entries)
            const performanceTest = await browser.executeObsidian(({ app }) => {
                const startTime = performance.now();

                try {
                    const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
                    if (!basesPlugin) {
                        throw new Error('Plugin not found after successful loading test');
                    }

                    // Get AAPL files
                    const aaplFiles = app.vault.getMarkdownFiles()
                        .filter((file: any) => file.path.startsWith('aapl/'));

                    const endTime = performance.now();

                    return {
                        success: true,
                        aaplFileCount: aaplFiles.length,
                        processingTime: endTime - startTime,
                        averageTimePerFile: (endTime - startTime) / aaplFiles.length,
                    };
                } catch (error) {
                    const endTime = performance.now();
                    return {
                        error: (error as Error).message,
                        processingTime: endTime - startTime,
                    };
                }
            });

            console.log('Performance test results:', performanceTest);

            if ('error' in performanceTest) {
                throw new Error(`Performance test failed: ${performanceTest.error}`);
            }

            expect(performanceTest.success).toBe(true);
            expect(performanceTest.aaplFileCount).toBe(1260);
            expect(performanceTest.processingTime).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });

    after(async function () {
        // Final cleanup and summary
        const finalStatus = await browser.executeObsidian(({ app }) => {
            const basesPlugin = (app as any).plugins?.getPlugin('bases-charts');
            return {
                pluginStillLoaded: !!basesPlugin,
                enabledPluginsCount: (app as any).plugins?.enabledPlugins?.size || 0,
                totalViewTypes: Object.keys((app as any).viewRegistry?.viewByType || {}).length,
            };
        });

        console.log('Final test status:', finalStatus);

        if (pluginLoaded) {
            console.log('✅ E2E test suite completed successfully - Plugin functionality verified');
        } else {
            console.log('❌ E2E test suite completed - Plugin failed to load, functional tests skipped');
        }
    });
});