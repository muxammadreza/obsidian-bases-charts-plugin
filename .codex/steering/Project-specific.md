---
inclusion: always
---

# Bases Charts Plugin Development Guidelines

## Build System and Tooling

### Package Manager and Scripts

- **Use Bun exclusively** for all package management and script execution
- Available scripts (use `bun run <script>`):
    - `dev` - Development build with watch mode using Vite (outputs to `dist/dev/`)
    - `build` - Production build using Vite (outputs to `dist/`)
    - `build:dev` - Development build without watch mode
    - `test` - Run unit tests with Bun test runner
    - `test:log` - Run tests with logging enabled
    - `test:e2e` - Run end-to-end tests with WebdriverIO (wdio-obsidian-service)
    - `format` - Format code with Prettier (includes Svelte plugin)
    - `format:check` - Check formatting without making changes
    - `lint` - ESLint with zero warnings policy
    - `lint:fix` - Auto-fix ESLint issues
    - `svelte-check` - Run Svelte compiler checks
    - `tsc` - TypeScript compilation check without emit
    - `check` - Full quality check (format, TypeScript, Svelte, lint, test)
    - `check:fix` - Auto-fix version of quality check
    - `release` - Build and release automation
    - `stats` - Generate project statistics

### Development Environment

- **Hot Reload**: Development builds automatically sync to vault directory if `REAL_VAULT_DIR` is set in `.env`
- **Source Maps**: Inline source maps in development mode for debugging
- **Build Output**: Single file output (`main.js`, `styles.css`, `manifest.json`) for Obsidian compatibility
- **External Dependencies**: Obsidian APIs and CodeMirror are externalized in build

### Code Quality Requirements

- **Zero tolerance policy**: All code must pass `bun run check` before proceeding
- TypeScript strict mode enabled with explicit return types required
- ESLint configured with obsidianmd plugin and import ordering rules
- Prettier formatting with tabs, 160 character width, single quotes
- Svelte 5 syntax compliance required

## Technology Stack Constraints

### Required Dependencies

- **@ticatec/uniface-echarts**: MANDATORY wrapper for all ECharts implementation
- **Obsidian 1.10+**: Minimum version for bases system and custom views
- **Svelte 5**: Required version with new syntax patterns
- **ECharts 6**: Chart rendering engine (via wrapper only)
- **TypeScript**: Strict mode with explicit typing

### Architecture Patterns

#### Chart Implementation

```typescript
// CORRECT: Extend UnifaceChart
export class ScatterChart extends UnifaceChart {
	protected createOption(): any {
		// Return ECharts configuration
	}

	protected postInitialize(chart: any): void {
		// Set up event handlers only here
		this.setEventHandlers({
			onClick: params => {
				/* handle click */
			},
		});
	}
}
```

#### Svelte Component Integration

```svelte
<!-- CORRECT: Use ChartPanel component from @ticatec/uniface-echarts -->
<script>
	import { ChartPanel } from '@ticatec/uniface-echarts';
	import { ScatterChart } from './charts/ScatterChart';

	const chart = new ScatterChart(chartView);
</script>

<ChartPanel chart={chart} />
```

### Current Architecture Patterns

#### State Management
```typescript
// CORRECT: Use Svelte 5 reactive state with stores
const configStore = createChartConfigStore();
const panelStore = createPanelStateStore();

// Reactive updates with $effect
$effect(() => {
	const config = $configStore;
	debouncedUpdateConfig(config);
});
```

#### Error Handling
```typescript
// CORRECT: Comprehensive error handling with user feedback
try {
	const dataWrapper = chartView.processData();
	updateChartData(dataWrapper);
} catch (error) {
	console.error('ChartViewComponent: Error in data update effect:', error);
	// Show user-friendly error message
}
```

#### Configuration Validation
```typescript
// CORRECT: Use Zod schemas for validation
const validation = validateChartConfig(config);
if (validation.success && validation.data) {
	this.config = validation.data;
	this.invalidate();
} else {
	console.error('Invalid chart configuration:', validation.errors);
}
```

### Forbidden Patterns

- ❌ Direct ECharts API calls (`echarts.init()`, `chart.setOption()`)
- ❌ Manual chart instance management or cleanup
- ❌ Custom resize observers or event listeners
- ❌ SveltePlot dependencies or patterns
- ❌ Obsidian API versions below 1.10
- ❌ Any TypeScript `any` types without explicit justification
- ❌ Unvalidated configuration updates
- ❌ Missing error boundaries in Svelte components

## Development Workflow

### Before Making Changes

1. Consult Context7 MCP for API documentation when implementing:
    - @ticatec/uniface-echarts wrapper usage
    - Obsidian 1.10+ bases APIs
    - ECharts 6 configuration options
    - Svelte 5 component patterns

### After Making Changes

1. Run `bun run check` and fix all issues
2. Ensure zero ESLint warnings/errors
3. Verify TypeScript compilation with no errors
4. Test functionality in development environment

### File Organization

- **Chart classes** (`packages/obsidian/src/charts/`): Extend UnifaceChart, implement createOption() and postInitialize()
- **Svelte components** (`packages/obsidian/src/components/`): Use ChartPanel, follow Svelte 5 patterns with $state and $effect
- **Configuration stores** (`packages/obsidian/src/stores/`): Use Svelte stores with Zod validation and debounced updates
- **Main plugin** (`packages/obsidian/src/main.ts`): Register bases view with Obsidian 1.10+ system
- **View integration** (`packages/obsidian/src/ChartView.ts`): Extends BasesView for data processing and file navigation

## Integration Requirements

### Obsidian Integration

- Target Obsidian 1.10+ exclusively (no backward compatibility)
- Use BasesView APIs for data access and file navigation
- Implement proper plugin lifecycle with automatic cleanup
- Follow Obsidian plugin development best practices

### Data Flow

1. Obsidian bases data → ChartView.processData() → DataWrapper
2. DataWrapper → Chart.updateData() → chart.invalidate() → createOption()
3. Configuration changes → Chart.updateConfig() → chart.invalidate() → createOption()
4. User interactions → postInitialize() event handlers → ChartView.openFile()
5. Svelte stores manage configuration state with debounced updates

## Quality Assurance

### Mandatory Checks

- All code must pass `bun run check` before submission
- Zero TypeScript errors or warnings
- Zero ESLint errors or warnings
- Proper Svelte 5 component structure
- No deprecated API usage
- Comprehensive error handling

### Testing Strategy

- **Unit Tests**: Use Bun test runner with HappyDOM for component testing
- **E2E Tests**: Use wdio-obsidian-service with real Obsidian instances
- **Test Data**: Use structured datasets (AAPL: 1260 entries, Movies: 100 entries, Penguins: 342 entries)
- **Chart Testing**: Test chart classes with mock DataWrapper objects
- **Integration Testing**: Verify Obsidian bases system integration
- **Configuration Testing**: Test Svelte stores and validation with Zod schemas
- **Error Boundary Testing**: Test ErrorBoundary components with fallback UI
- **Performance Testing**: Test with large datasets using generated test data
