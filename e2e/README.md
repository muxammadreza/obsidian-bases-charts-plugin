# Obsidian Plugin E2E Testing Framework

This directory contains the end-to-end testing framework for the Bases Charts Obsidian plugin. The framework is built on Playwright and provides comprehensive testing capabilities specifically designed for Obsidian plugin development.

## Features

- **Automated Obsidian Environment Setup**: Automatically sets up test vaults and enables plugins
- **Console Monitoring**: Real-time capture and analysis of console output with automated issue detection
- **Visual Regression Testing**: Screenshot capture and comparison for chart rendering
- **Performance Monitoring**: Chart rendering performance, memory usage, and interaction timing
- **Custom Fixtures**: Obsidian-specific test utilities and helpers
- **Comprehensive Reporting**: Detailed HTML reports with debugging information

## Quick Start

### Prerequisites

- Node.js 18+
- Bun package manager
- Playwright browsers installed

### Installation

```bash
# Install dependencies (already done if you ran bun install)
bun add -D @playwright/test playwright

# Install Playwright browsers
bunx playwright install
```

### Running Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run tests with browser UI visible
bun run test:e2e:headed

# Run tests in debug mode
bun run test:e2e:debug

# Run tests with Playwright UI
bun run test:e2e:ui
```

## Framework Architecture

### Core Components

#### Fixtures (`fixtures/obsidian-fixtures.ts`)
Custom Playwright fixtures that provide:
- `obsidianEnv`: Obsidian test environment management
- `chartHelper`: Chart creation and testing utilities
- `consoleMonitor`: Console output monitoring and analysis
- `visualTesting`: Screenshot and visual regression testing
- `performanceMonitor`: Performance metrics and monitoring

#### Utilities (`utils/`)
- **ObsidianTestEnvironment**: Manages Obsidian setup, plugin enabling, and cleanup
- **ChartTestHelper**: Provides chart-specific testing methods
- **ConsoleMonitor**: Captures and analyzes console output with error pattern detection
- **VisualTestingHelper**: Handles screenshots and visual comparisons
- **PerformanceMonitor**: Tracks performance metrics and detects issues
- **TestDataManager**: Generates various types of test data
- **TestVaultManager**: Creates and manages test vaults

#### Reporters (`reporters/`)
- **ObsidianReporter**: Custom reporter with Obsidian-specific analysis and recommendations

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/obsidian-fixtures';

test.describe('My Test Suite', () => {
  test('should test chart functionality', async ({ 
    obsidianEnv, 
    chartHelper, 
    consoleMonitor 
  }) => {
    // Create and test a chart
    await chartHelper.createScatterChart();
    await chartHelper.verifyChartDisplayed();
    
    // Check for console errors
    const errors = consoleMonitor.getErrors();
    expect(errors).toHaveLength(0);
  });
});
```

### Available Fixtures

#### `obsidianEnv`
- `setup()`: Set up Obsidian environment
- `openChartView(type)`: Open chart view
- `createBase(name, data)`: Create test base
- `cleanup()`: Clean up environment

#### `chartHelper`
- `createScatterChart(data?)`: Create scatter chart
- `createLineChart(data?)`: Create line chart
- `createBarChart(data?)`: Create bar chart
- `verifyChartDisplayed()`: Verify chart is rendered
- `testChartInteractions()`: Test chart interactions
- `openConfigurationPanel()`: Open config panel

#### `consoleMonitor`
- `getErrors()`: Get console errors
- `getWarnings()`: Get console warnings
- `getCriticalIssues()`: Get critical issues
- `generateReport()`: Generate console report

#### `visualTesting`
- `captureChartScreenshot(name)`: Capture chart screenshot
- `compareChartWithBaseline(name)`: Compare with baseline
- `testResponsiveDesign(name)`: Test responsive design

#### `performanceMonitor`
- `measureChartCreation()`: Measure chart creation time
- `measureMemoryUsage()`: Measure memory usage
- `detectMemoryLeaks()`: Detect memory leaks
- `generateReport()`: Generate performance report

## Test Data

The framework provides utilities for generating various types of test data:

```typescript
import { TestDataManager } from '../utils/test-data-manager';

// Generate scatter plot data
const scatterData = TestDataManager.generateScatterData(50);

// Generate time series data
const timeSeriesData = TestDataManager.generateTimeSeriesData(30);

// Generate categorical data
const categoricalData = TestDataManager.generateCategoricalData(['A', 'B', 'C']);

// Generate edge case data
const edgeCaseData = TestDataManager.generateEdgeCaseData();

// Generate large dataset for performance testing
const largeData = TestDataManager.generateLargeDataset(1000);
```

## Console Monitoring

The framework automatically monitors console output and detects common issues:

### Detected Error Patterns
- UnifaceChart wrapper issues
- Svelte component mounting errors
- ECharts initialization problems
- Obsidian plugin loading failures
- General JavaScript errors

### Example Usage
```typescript
test('should detect console issues', async ({ consoleMonitor }) => {
  // Test operations that might generate console output
  
  // Check for specific types of issues
  const criticalIssues = consoleMonitor.getCriticalIssues();
  const errors = consoleMonitor.getErrors();
  const warnings = consoleMonitor.getWarnings();
  
  // Generate comprehensive report
  const report = consoleMonitor.generateReport();
  console.log(report.recommendations);
});
```

## Visual Regression Testing

Capture and compare screenshots to detect visual changes:

```typescript
test('should maintain visual consistency', async ({ visualTesting }) => {
  // Capture current screenshot
  await visualTesting.captureChartScreenshot('my-chart');
  
  // Compare with baseline (will create baseline on first run)
  const isConsistent = await visualTesting.compareChartWithBaseline('my-chart');
  expect(isConsistent).toBe(true);
  
  // Test responsive design
  const responsiveResults = await visualTesting.testResponsiveDesign('my-chart');
  expect(responsiveResults.every(r => r.isVisible)).toBe(true);
});
```

## Performance Testing

Monitor and measure performance metrics:

```typescript
test('should meet performance requirements', async ({ performanceMonitor }) => {
  // Measure chart creation
  const creationResult = await performanceMonitor.measureChartCreation();
  expect(creationResult.duration).toBeLessThan(2000);
  
  // Check memory usage
  const memoryUsage = await performanceMonitor.measureMemoryUsage();
  expect(memoryUsage?.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
  
  // Detect memory leaks
  const leakResult = await performanceMonitor.detectMemoryLeaks();
  expect(leakResult.hasLeak).toBe(false);
});
```

## Configuration

### Playwright Configuration (`playwright.config.ts`)
- Browser settings optimized for Obsidian
- Custom timeouts for plugin operations
- Multiple reporters including custom Obsidian reporter
- Cross-browser testing configuration

### Environment Variables
- `OBSIDIAN_BASE_URL`: Base URL for Obsidian instance (default: http://localhost:8080)
- `CI`: Enables CI-specific settings (retries, workers, etc.)

## Reports

The framework generates several types of reports:

### HTML Report (`test-results/html-report/`)
Standard Playwright HTML report with test results and traces

### Obsidian Report (`test-results/obsidian-report.html`)
Custom report with:
- Test summary with Obsidian-specific context
- Console analysis and issue detection
- Performance metrics
- Recommendations for fixing issues

### Console Analysis (`test-results/console-analysis.json`)
Detailed console output analysis with categorized issues

### Performance Report (`test-results/performance-report.json`)
Performance metrics and recommendations

## Best Practices

1. **Use Fixtures**: Always use the provided fixtures for consistent test setup
2. **Check Console Output**: Monitor console for errors and warnings
3. **Test Performance**: Include performance assertions for critical operations
4. **Visual Testing**: Use visual regression testing for UI components
5. **Clean Data**: Use the test data generators for consistent test scenarios
6. **Error Handling**: Test error conditions and edge cases
7. **Responsive Design**: Test charts across different viewport sizes

## Troubleshooting

### Common Issues

1. **Plugin Not Loading**
   - Check plugin manifest and dependencies
   - Verify Obsidian version compatibility
   - Check console for loading errors

2. **Chart Not Rendering**
   - Verify @ticatec/uniface-echarts wrapper usage
   - Check ECharts library loading
   - Monitor console for JavaScript errors

3. **Test Timeouts**
   - Increase timeout values in configuration
   - Check for slow operations or infinite loops
   - Monitor performance metrics

4. **Visual Regression Failures**
   - Update baselines if changes are intentional
   - Check for timing issues with animations
   - Verify consistent test environment

### Debug Mode

Run tests in debug mode to step through test execution:

```bash
bun run test:e2e:debug
```

This opens the Playwright inspector where you can:
- Step through test actions
- Inspect page elements
- View console output
- Examine network requests

## Contributing

When adding new tests:

1. Use the existing fixtures and utilities
2. Follow the naming conventions
3. Include appropriate assertions
4. Add console monitoring
5. Consider performance implications
6. Update documentation as needed

## Integration with CI/CD

The framework is designed to work in CI/CD environments:

- Headless mode by default in CI
- JUnit XML output for CI integration
- Artifact collection (screenshots, traces, reports)
- Parallel execution support
- Retry logic for flaky tests