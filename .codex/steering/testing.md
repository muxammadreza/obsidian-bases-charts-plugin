---
inclusion: always
---

# Testing Environment Guidelines

## Test Architecture Overview

### Unit Testing
- **Framework**: Bun test runner with HappyDOM for DOM simulation
- **Location**: `test/unit/` directory
- **Command**: `bun test` or `bun run test`
- **Environment**: Node.js environment with mocked Obsidian APIs
- **Purpose**: Test individual components, utilities, and chart classes in isolation

### End-to-End Testing
- **Framework**: WebdriverIO (WDIO) with wdio-obsidian-service
- **Location**: `test/specs/` directory (files must end with `.e2e.ts`)
- **Command**: `bun run test:e2e`
- **Environment**: Real Obsidian instances with plugin loaded
- **Purpose**: Test complete user workflows and plugin integration

## E2E Testing with wdio-obsidian-service

### Configuration
- **Config File**: `wdio.conf.mts`
- **Test Vault**: `test/vaults/exampleVault` (contains sample bases data, you might need to adjust the .base files when code changes.)
- **Obsidian Versions**: Tests against latest and latest-beta automatically
- **Mobile Testing**: Includes mobile emulation tests
- **Parallel Execution**: Up to 4 Obsidian instances by default

### Test Vault Structure
The `test/vaults/exampleVault` contains:
- **Base Files**: `aapl.base`, `bar.base`, `movies.base`, `penguins.base`
- **Generated Data**: Thousands of markdown files in corresponding folders
- **Canvas Files**: For testing chart embedding in canvas
- **Sample Files**: `Embed Test.md` for testing chart embedding

### Key WDIO-Obsidian APIs

#### Essential Functions
```typescript
// Execute code within Obsidian context
await browser.executeObsidian(({app, obsidian}) => {
  // Access app and obsidian APIs here
});

// Execute Obsidian commands
await browser.executeObsidianCommand("command-id");

// Vault management
await obsidianPage.resetVault("test/vaults/exampleVault");
await browser.reloadObsidian({vault: "test/vaults/exampleVault"});
await obsidianPage.loadWorkspaceLayout("layout-name");
```

#### Element Selection
```typescript
// Standard WebDriver selectors work
const element = browser.$(".modal-container .modal-content");
await expect(element).toExist();
await expect(element).toHaveText("Expected Text");
```

### Test Data Requirements

#### For Chart Testing
- **AAPL Dataset**: 1260 entries (stock data) - `test/vaults/exampleVault/aapl/`
  - Files: `0.md` through `1259.md` with stock price data
  - Base file: `aapl.base` defines properties like date, open, high, low, close, volume
- **Movies Dataset**: Generated entries - `test/vaults/exampleVault/movies/`
  - Base file: `movies.base` for movie data structure
- **Penguins Dataset**: 342 entries - `test/vaults/exampleVault/penguins/`
  - Base file: `penguins.base` for penguin species data
- **Bar Dataset**: 3 entries (simple bar chart) - `test/vaults/exampleVault/bar/`
  - Base file: `bar.base` for basic bar chart testing

#### Base File Format
Each `.base` file defines the structure and metadata for the corresponding dataset, used by the Obsidian bases system. These files configure:
- Property definitions and types
- Display names and formatting
- Data validation rules
- Chart configuration defaults

#### Test Data Generation
- Use `test/vaults/exampleData/generateFiles.ts` for creating test datasets
- CSV files in `test/vaults/exampleData/` contain source data
- Generated markdown files follow consistent naming patterns

## Testing Best Practices

### Unit Tests
- **Chart Classes**: Test ScatterChart, LineChart, BarChart extending UnifaceChart
- **Mock Setup**: Use `test/unit/obsidianMock.ts` for Obsidian API mocking
- **DOM Testing**: Use HappyDOM via `test/unit/happydom.ts` for DOM-dependent tests
- **Svelte Testing**: Use `test/unit/svelteLoader.ts` for Svelte component testing
- **Focus Areas**: 
  - Data processing and transformation (`ChartData.ts`)
  - Configuration validation with Zod schemas
  - Store state management and reactivity
  - Error handling and boundary conditions
  - Chart option generation and ECharts integration

### E2E Tests
- Use `obsidianPage.resetVault()` in `beforeEach` for clean state
- Test complete user workflows (open chart, configure, interact)
- Verify chart rendering and user interactions
- Test file navigation and embedding functionality
- Use Context7 MCP to reference wdio-obsidian-service documentation

### Documentation Reference
- **Primary**: Use Context7 MCP for wdio-obsidian-service documentation
- **API Reference**: wdio-obsidian-service provides comprehensive Obsidian testing utilities
- **Examples**: Refer to existing tests in `test/specs/test.e2e.ts`

## Test Execution

### Commands
```bash
# Unit tests only
bun test

# E2E tests only  
bun run test:e2e

# All quality checks including tests
bun run check
```

### CI/CD Integration
- Tests run on multiple Obsidian versions automatically
- Obsidian cache management handled by wdio-obsidian-service
- Mobile emulation included in test matrix

## Common Patterns

### Testing Chart Functionality
```typescript
it('should render scatter chart with bases data', async function() {
  // Reset vault to clean state
  await obsidianPage.resetVault("test/vaults/exampleVault");
  
  // Open bases view for AAPL dataset
  await browser.executeObsidian(({app}) => {
    // Access bases system and open chart view
    const basesPlugin = app.plugins.getPlugin('bases-charts');
    return basesPlugin?.openChartView('aapl');
  });
  
  // Verify chart container exists with proper data-type
  const chartContainer = browser.$(".bases-chart-view[data-type='bases']");
  await expect(chartContainer).toExist();
  
  // Verify ECharts canvas renders
  const canvas = chartContainer.$("canvas");
  await expect(canvas).toExist();
});
```

### Testing Configuration Changes
```typescript
it('should update chart on config change', async function() {
  // Change configuration
  await browser.$("[data-testid='x-axis-selector']").selectByValue("date");
  
  // Verify chart updates
  await browser.waitUntil(async () => {
    const chartData = await browser.executeObsidian(({app}) => {
      // Return current chart state
    });
    return chartData.xAxis === 'date';
  });
});
``` 