<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { PanelState, ChartConfig } from 'packages/obsidian/src/stores';
	import { panelStateHelpers } from 'packages/obsidian/src/stores';
	import AppearanceSection from './config-sections/AppearanceSection.svelte';
	import DataSection from './config-sections/DataSection.svelte';
	import AxesSection from './config-sections/AxesSection.svelte';
	import ChartTypeSection from './config-sections/ChartTypeSection.svelte';
	import ErrorBoundary from './ErrorBoundary.svelte';

	interface Props {
		panelStore: Writable<PanelState>;
		configStore: Writable<ChartConfig>;
	}

	let { panelStore, configStore }: Props = $props();

	// Reactive state from stores
	let panelState = $state($panelStore);
	let config = $state($configStore);

	// Panel dragging state
	let isDragging = $state(false);
	let dragOffset = $state({ x: 0, y: 0 });
	let panelElement: HTMLDivElement | undefined = $state();

	// Subscribe to store changes
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

	/**
	 * Handle panel drag start
	 */
	function handleDragStart(event: MouseEvent): void {
		if (!panelElement) return;

		isDragging = true;
		const rect = panelElement.getBoundingClientRect();
		dragOffset = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};

		// Add global event listeners
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', handleDragEnd);

		// Prevent text selection during drag
		event.preventDefault();
	}

	/**
	 * Handle panel drag move
	 */
	function handleDragMove(event: MouseEvent): void {
		if (!isDragging || !panelElement) return;

		const newX = event.clientX - dragOffset.x;
		const newY = event.clientY - dragOffset.y;

		// Constrain to viewport
		const maxX = window.innerWidth - panelState.position.width;
		const maxY = window.innerHeight - panelState.position.height;

		const constrainedX = Math.max(0, Math.min(newX, maxX));
		const constrainedY = Math.max(0, Math.min(newY, maxY));

		panelStateHelpers.updatePosition(panelStore, {
			x: constrainedX,
			y: constrainedY,
		});
	}

	/**
	 * Handle panel drag end
	 */
	function handleDragEnd(): void {
		isDragging = false;

		// Remove global event listeners
		document.removeEventListener('mousemove', handleDragMove);
		document.removeEventListener('mouseup', handleDragEnd);
	}

	/**
	 * Toggle panel visibility
	 */
	function togglePanel(): void {
		panelStateHelpers.toggleVisibility(panelStore);
	}

	/**
	 * Toggle collapsed state
	 */
	function toggleCollapsed(): void {
		panelStateHelpers.toggleCollapsed(panelStore);
	}

	/**
	 * Handle keyboard navigation
	 */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			panelStateHelpers.hide(panelStore);
		}
	}

	/**
	 * Set active section
	 */
	function setActiveSection(section: string): void {
		panelStateHelpers.setActiveSection(panelStore, section);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Panel Toggle Button -->
<button class="panel-toggle-btn" onclick={togglePanel} aria-label="Toggle configuration panel" title="Toggle configuration panel">
	<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<circle cx="12" cy="12" r="3"></circle>
		<path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
	</svg>
</button>

<!-- Configuration Panel -->
{#if panelState.visible}
	<div
		bind:this={panelElement}
		class="configuration-panel"
		class:collapsed={panelState.collapsed}
		class:dragging={isDragging}
		style="
			left: {panelState.position.x}px;
			top: {panelState.position.y}px;
			width: {panelState.position.width}px;
			height: {panelState.collapsed ? 'auto' : panelState.position.height + 'px'};
		"
		role="dialog"
		aria-label="Chart configuration panel"
		tabindex="-1"
	>
		<!-- Panel Header -->
		<div class="panel-header" onmousedown={handleDragStart} role="button" tabindex="0" aria-label="Drag to move panel">
			<h3 class="panel-title">Chart Configuration</h3>
			<div class="panel-controls">
				<button
					class="panel-control-btn"
					onclick={toggleCollapsed}
					aria-label={panelState.collapsed ? 'Expand panel' : 'Collapse panel'}
					title={panelState.collapsed ? 'Expand panel' : 'Collapse panel'}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						{#if panelState.collapsed}
							<polyline points="6,9 12,15 18,9"></polyline>
						{:else}
							<polyline points="18,15 12,9 6,15"></polyline>
						{/if}
					</svg>
				</button>
				<button class="panel-control-btn" onclick={togglePanel} aria-label="Close panel" title="Close panel">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		</div>

		<!-- Panel Content -->
		{#if !panelState.collapsed}
			<div class="panel-content">
				<!-- Section Navigation -->
				<div class="section-nav" role="tablist">
					{#each ['chartType', 'appearance', 'data', 'axes'] as section}
						<button
							class="section-tab"
							class:active={panelState.activeSection === section}
							onclick={() => setActiveSection(section)}
							role="tab"
							aria-selected={panelState.activeSection === section}
							aria-controls="section-{section}"
							tabindex={panelState.activeSection === section ? 0 : -1}
						>
							{section.charAt(0).toUpperCase() + section.slice(1)}
						</button>
					{/each}
				</div>

				<!-- Section Content -->
				<div class="section-content" role="tabpanel" id="section-{panelState.activeSection}">
					<ErrorBoundary fallback="Failed to load configuration section. Please try refreshing the panel.">
						{#snippet children()}
							{#if panelState.activeSection === 'chartType'}
								<ChartTypeSection configStore={configStore} />
							{:else if panelState.activeSection === 'appearance'}
								<AppearanceSection configStore={configStore} />
							{:else if panelState.activeSection === 'data'}
								<DataSection configStore={configStore} />
							{:else if panelState.activeSection === 'axes'}
								<AxesSection configStore={configStore} />
							{/if}
						{/snippet}
					</ErrorBoundary>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.panel-toggle-btn {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 1000;
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 8px;
		cursor: pointer;
		color: var(--text-normal);
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.panel-toggle-btn:hover {
		background: var(--background-modifier-hover);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.configuration-panel {
		position: fixed;
		z-index: 1001;
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		min-width: 280px;
		max-width: 90vw;
		max-height: 90vh;
		user-select: none;
		transition: box-shadow 0.2s ease;
	}

	.configuration-panel.dragging {
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
		cursor: grabbing;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: var(--background-secondary);
		border-bottom: 1px solid var(--background-modifier-border);
		cursor: grab;
		user-select: none;
	}

	.panel-header:active {
		cursor: grabbing;
	}

	.panel-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-normal);
	}

	.panel-controls {
		display: flex;
		gap: 4px;
	}

	.panel-control-btn {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-muted);
		border-radius: 3px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.panel-control-btn:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.panel-content {
		display: flex;
		flex-direction: column;
		height: calc(100% - 49px);
		overflow: hidden;
	}

	.section-nav {
		display: flex;
		background: var(--background-secondary);
		border-bottom: 1px solid var(--background-modifier-border);
		overflow-x: auto;
	}

	.section-tab {
		background: none;
		border: none;
		padding: 12px 16px;
		cursor: pointer;
		color: var(--text-muted);
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.section-tab:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.section-tab.active {
		color: var(--text-accent);
		border-bottom-color: var(--text-accent);
		background: var(--background-primary);
	}

	.section-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.configuration-panel {
			width: 90vw !important;
			height: 70vh !important;
			left: 5vw !important;
			top: 15vh !important;
		}

		.section-nav {
			overflow-x: auto;
		}

		.section-tab {
			min-width: 80px;
		}
	}

	/* Accessibility improvements */
	.configuration-panel:focus-within {
		outline: 2px solid var(--text-accent);
		outline-offset: -2px;
	}

	.panel-control-btn:focus,
	.section-tab:focus,
	.panel-toggle-btn:focus {
		outline: 2px solid var(--text-accent);
		outline-offset: 2px;
	}

	/* Animation for panel appearance */
	.configuration-panel {
		animation: panelSlideIn 0.2s ease-out;
	}

	@keyframes panelSlideIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}
</style>
