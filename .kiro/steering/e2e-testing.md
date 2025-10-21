---
inclusion: fileMatch
fileMatchPattern: ['test/**/*.ts', 'test/**/*.e2e.ts', 'wdio.conf.mts']
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
- **Test Vault**: `test/vaults/exampleVault` (contains sample bases data)
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
- **AAPL Dataset**: 1260 entries (stock data) - test/vaults/exampleVault/aapl/
- **Movies Dataset**: 100 entries - test/vaults/exampleVault/movies/
- **Penguins Dataset**: 342 entries - test/vaults/exampleVault/penguins/
- **Bar Dataset**: 3 entries (simple bar chart) - test/vaults/exampleVault/bar/

#### Base File Format
Each `.base` file defines the structure and metadata for the corresponding dataset, used by the Obsidian bases system.

## Testing Best Practices

### Unit Tests
- Test chart classes by extending UnifaceChart
- Mock Obsidian APIs using `test/unit/obsidianMock.ts`
- Use HappyDOM for DOM-dependent tests
- Focus on logic, data processing, and configuration validation

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
it('should render scatter chart', async function() {
  // Open bases view
  await browser.executeObsidianCommand("bases:open-view");
  
  // Select dataset and chart type
  await browser.$("[data-testid='dataset-selector']").selectByValue("aapl");
  await browser.$("[data-testid='chart-type']").selectByValue("scatter");
  
  // Verify chart renders
  const chartContainer = browser.$(".chart-container canvas");
  await expect(chartContainer).toExist();
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