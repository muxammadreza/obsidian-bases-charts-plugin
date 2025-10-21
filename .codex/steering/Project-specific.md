---
inclusion: always
---

# Bases Charts Plugin Development Guidelines

## Build System and Tooling

### Package Manager and Scripts

- **Use Bun exclusively** for all package management and script execution
- Available scripts (use `bun run <script>`):
    - `dev` - Development build with watch mode using Vite
    - `build` - Production build using Vite
    - `test` - Run tests with Bun test runner
	- `test:e2e` - Run end-to-end tests with WebdriverIO (wdio-obsidian-service)
    - `format` - Format code with Prettier (includes Svelte plugin)
    - `lint` - ESLint with zero warnings policy
    - `check` - Full quality check (format, TypeScript, Svelte, lint, test)
    - `check:fix` - Auto-fix version of quality check

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
<!-- CORRECT: Use ChartPanel component -->
<script>
	import ChartPanel from '@ticatec/uniface-echarts';
	import { ScatterChart } from './charts/ScatterChart';

	const chart = new ScatterChart();
</script>

<ChartPanel chart={chart} />
```

### Forbidden Patterns

- ❌ Direct ECharts API calls (`echarts.init()`, `chart.setOption()`)
- ❌ Manual chart instance management or cleanup
- ❌ Custom resize observers or event listeners
- ❌ SveltePlot dependencies or patterns
- ❌ Obsidian API versions below 1.10
- ❌ Any TypeScript `any` types without explicit justification

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

- Chart classes: Extend UnifaceChart, implement createOption() and postInitialize()
- Svelte components: Use ChartPanel, follow Svelte 5 patterns
- Configuration: Use Svelte stores with chart.invalidate() for updates
- Main plugin: Integrate with Obsidian 1.10+ bases system

## Integration Requirements

### Obsidian Integration

- Target Obsidian 1.10+ exclusively (no backward compatibility)
- Use BasesView APIs for data access and file navigation
- Implement proper plugin lifecycle with automatic cleanup
- Follow Obsidian plugin development best practices

### Data Flow

1. Obsidian bases data → Chart class constructor/methods
2. Chart class createOption() → ECharts configuration
3. Configuration changes → chart.invalidate() → automatic re-render
4. User interactions → postInitialize() event handlers → Obsidian actions

## Quality Assurance

### Mandatory Checks

- All code must pass `bun run check` before submission
- Zero TypeScript errors or warnings
- Zero ESLint errors or warnings
- Proper Svelte 5 component structure
- No deprecated API usage
- Comprehensive error handling

### Testing Strategy

- Use Bun test runner with HappyDOM for component testing
- Use wdio-obsidian-service for end-to-end tests
- Test chart classes with mock data
- Verify Obsidian integration with bases system
- Test configuration panel functionality
- Performance testing with large datasets
