---
inclusion: always
---

# Svelte 5 Implementation Patterns

## CRITICAL: Svelte 5 Syntax Requirements

**MANDATORY:** All Svelte components MUST use Svelte 5 syntax patterns. The codebase has migrated from Svelte 4 and uses the new runes system exclusively.

## Core Svelte 5 Patterns

### 1. Component Props with TypeScript

```svelte
<script lang="ts">
	interface Props {
		chartView: ChartView;
		configStore: Writable<ChartConfig>;
	}

	let { chartView, configStore }: Props = $props();
</script>
```

### 2. Reactive State with $state

```svelte
<script lang="ts">
	// CORRECT: Use $state for component-local reactive state
	let chart: ScatterChart | LineChart | BarChart | undefined = $state(createChartInstance($configStore.chartType));
	let isDragging = $state(false);
	let panelElement: HTMLDivElement | undefined = $state();
</script>
```

### 3. Effects with $effect

```svelte
<script lang="ts">
	// CORRECT: Use $effect for reactive side effects
	$effect(() => {
		try {
			const dataWrapper = chartView.processData();
			updateChartData(dataWrapper);
		} catch (error) {
			console.error('ChartViewComponent: Error in data update effect:', error);
		}
	});

	// CORRECT: Effect with cleanup
	$effect(() => {
		const unsubscribePanel = panelStore.subscribe(value => {
			panelState = value;
		});
		const unsubscribeConfig = configStore.subscribe(value => {
			config = value;
		});

		return () => {
			unsubscribePanel();
			unsubscribeConfig();
		};
	});
</script>
```

### 4. Snippets for Reusable Content

```svelte
<script lang="ts">
	interface Props {
		fallback?: string;
		onError?: (error: Error) => void;
		children?: import('svelte').Snippet;
	}

	let { fallback = 'Something went wrong', onError, children }: Props = $props();
</script>

<!-- CORRECT: Use snippets for reusable content blocks -->
<ErrorBoundary fallback="Failed to render chart." onError={error => console.error('Chart error:', error)}>
	{#snippet children()}
		<ChartPanel chart={chart} />
	{/snippet}
</ErrorBoundary>

<!-- CORRECT: Render snippets -->
{@render children?.()}
```

### 5. Store Integration

```svelte
<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { createChartConfigStore } from 'packages/obsidian/src/stores';

	// CORRECT: Create stores in component
	const configStore = createChartConfigStore();
	
	// CORRECT: Reactive state from stores
	let config = $state($configStore);

	// CORRECT: Subscribe to store changes with effect
	$effect(() => {
		const unsubscribe = configStore.subscribe(value => {
			config = value;
		});
		return unsubscribe;
	});
</script>
```

## Error Handling Patterns

### 1. Error Boundaries

```svelte
<!-- CORRECT: Wrap components in ErrorBoundary -->
<ErrorBoundary fallback="Failed to load configuration section.">
	{#snippet children()}
		{#if panelState.activeSection === 'chartType'}
			<ChartTypeSection configStore={configStore} />
		{:else if panelState.activeSection === 'appearance'}
			<AppearanceSection configStore={configStore} />
		{/if}
	{/snippet}
</ErrorBoundary>
```

### 2. Try-Catch in Effects

```svelte
<script lang="ts">
	$effect(() => {
		try {
			const newChartType = $configStore.chartType;
			chart = createChartInstance(newChartType);
		} catch (error) {
			console.error('ChartViewComponent: Error in chart type change effect:', error);
		}
	});
</script>
```

## Event Handling Patterns

### 1. Function Declarations

```svelte
<script lang="ts">
	/**
	 * Handle panel drag start
	 */
	function handleDragStart(event: MouseEvent): void {
		if (!panelElement) return;

		isDragging = true;
		// ... implementation
		event.preventDefault();
	}

	/**
	 * Toggle panel visibility
	 */
	function togglePanel(): void {
		panelStateHelpers.toggleVisibility(panelStore);
	}
</script>

<!-- CORRECT: Use function references in event handlers -->
<button onclick={togglePanel} aria-label="Toggle configuration panel">
	Toggle
</button>
```

### 2. Keyboard Event Handling

```svelte
<script lang="ts">
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			panelStateHelpers.hide(panelStore);
		}
	}
</script>

<!-- CORRECT: Global event listeners -->
<svelte:window on:keydown={handleKeydown} />
```

## Styling and CSS

### 1. Component Styles

```svelte
<style>
	.chart-container {
		width: 100%;
		height: 100%;
		min-height: 400px;
		position: relative;
	}

	/* CORRECT: Use CSS custom properties for theming */
	.configuration-panel {
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		color: var(--text-normal);
	}

	/* CORRECT: Responsive design */
	@media (max-width: 768px) {
		.configuration-panel {
			width: 90vw !important;
			height: 70vh !important;
		}
	}
</style>
```

### 2. Dynamic Classes

```svelte
<div
	class="configuration-panel"
	class:collapsed={panelState.collapsed}
	class:dragging={isDragging}
	style="
		left: {panelState.position.x}px;
		top: {panelState.position.y}px;
		width: {panelState.position.width}px;
	"
>
```

## Forbidden Svelte Patterns

- ❌ Svelte 4 syntax (`export let prop`)
- ❌ Old reactive statements (`$: reactive = value`)
- ❌ Old store syntax without proper effects
- ❌ Missing TypeScript interfaces for props
- ❌ Unhandled errors in effects
- ❌ Direct DOM manipulation instead of Svelte bindings
- ❌ Missing accessibility attributes
- ❌ Inline styles without CSS custom properties

## Required Patterns

- ✅ Use `$props()` for component props with TypeScript interfaces
- ✅ Use `$state()` for reactive component state
- ✅ Use `$effect()` for side effects with proper cleanup
- ✅ Use snippets for reusable content blocks
- ✅ Wrap components in ErrorBoundary for error handling
- ✅ Use proper TypeScript typing for all props and state
- ✅ Include accessibility attributes (aria-label, role, etc.)
- ✅ Use CSS custom properties for consistent theming
- ✅ Handle keyboard navigation and focus management

## Integration with Stores

### 1. Configuration Store Updates

```svelte
<script lang="ts">
	// CORRECT: Debounced configuration updates
	let configUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	
	function debouncedUpdateConfig(config: ChartConfig): void {
		if (configUpdateTimeout) {
			clearTimeout(configUpdateTimeout);
		}
		configUpdateTimeout = setTimeout(() => {
			updateChartConfig(config);
			configUpdateTimeout = null;
		}, DEFAULT_CONFIG_DEBOUNCE_DELAY);
	}

	$effect(() => {
		const config = $configStore;
		debouncedUpdateConfig(config);
	});
</script>
```

### 2. Store Helper Functions

```svelte
<script lang="ts">
	import { panelStateHelpers } from 'packages/obsidian/src/stores';

	function setActiveSection(section: string): void {
		panelStateHelpers.setActiveSection(panelStore, section);
	}
</script>
```

This ensures all Svelte components follow the current Svelte 5 patterns used throughout the codebase.