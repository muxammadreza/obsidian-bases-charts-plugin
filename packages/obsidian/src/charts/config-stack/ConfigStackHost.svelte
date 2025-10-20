<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import ConfigPanel from 'packages/obsidian/src/charts/config-stack/ConfigPanel.svelte';
	import { cloneConfigStackState, createEmptyConfigStackState } from 'packages/obsidian/src/charts/config-stack/state';
	import type {
		ConfigStackApplyDetail,
		ConfigStackRevertDetail,
		ConfigStackState,
		ConfigStackToggleDetail,
	} from 'packages/obsidian/src/charts/config-stack/types';

	interface Props {
		chartId: string;
		autoHideMs?: number;
		state?: ConfigStackState;
		baseline?: ConfigStackState;
	}

	const props = $props<Props>();

	let chartId = $state(props.chartId);
	let autoHideMs = $state(props.autoHideMs ?? 3000);
	let baseline = $state(cloneConfigStackState(props.baseline ?? createEmptyConfigStackState()));
	let state = $state(cloneConfigStackState(props.state ?? baseline));
	let propsStateSignature = JSON.stringify(props.state ?? baseline);
	let visible = $state(false);
	let pinned = $state(false);
	let autoHideTimer: ReturnType<typeof setTimeout> | null = null;
	let publishedSignature = '';

	const dispatch = createEventDispatcher<{
		toggle: ConfigStackToggleDetail;
		applyConfig: ConfigStackApplyDetail;
		revert: ConfigStackRevertDetail;
		change: ConfigStackState;
	}>();

	$effect(() => {
		chartId = props.chartId;
	});

	$effect(() => {
		autoHideMs = props.autoHideMs ?? 3000;
	});

	$effect(() => {
		const nextBaseline = cloneConfigStackState(props.baseline ?? createEmptyConfigStackState());
		const baselineSignature = JSON.stringify(nextBaseline);
		const currentSignature = JSON.stringify(baseline);
		if (baselineSignature !== currentSignature) {
			baseline = nextBaseline;
			if (!visible) {
				state = cloneConfigStackState(nextBaseline);
			}
		}
	});

	$effect(() => {
		const providedState = props.state ?? baseline;
		const providedSignature = JSON.stringify(providedState);
		if (providedSignature !== propsStateSignature) {
			propsStateSignature = providedSignature;
			state = cloneConfigStackState(providedState);
		}
	});

	function clearAutoHide(): void {
		if (autoHideTimer) {
			clearTimeout(autoHideTimer);
			autoHideTimer = null;
		}
	}

	function scheduleAutoHide(): void {
		if (!visible || pinned) {
			return;
		}
		clearAutoHide();
		autoHideTimer = setTimeout(() => {
			visible = false;
		}, autoHideMs);
	}

	$effect(() => {
		dispatch('toggle', {
			chartId,
			visible,
			pinned,
		});
		if (!visible || pinned) {
			clearAutoHide();
		} else {
			scheduleAutoHide();
		}
	});

	$effect(() => {
		const signature = JSON.stringify(state);
		if (signature === publishedSignature) {
			return;
		}
		publishedSignature = signature;
		dispatch('applyConfig', {
			chartId,
			state: cloneConfigStackState(state),
		});
		if (visible && !pinned) {
			scheduleAutoHide();
		}
	});

	function handleToggle(): void {
		visible = !visible;
	}

	function handlePinToggle(): void {
		pinned = !pinned;
	}

	function handlePanelChange(event: CustomEvent<ConfigStackState>): void {
		state = cloneConfigStackState(event.detail);
		dispatch('change', cloneConfigStackState(state));
	}

	function handleReset(): void {
		state = cloneConfigStackState(baseline);
		dispatch('change', cloneConfigStackState(state));
		dispatch('revert', {
			chartId,
			state: cloneConfigStackState(state),
		});
		if (visible && !pinned) {
			scheduleAutoHide();
		}
	}

	function handlePointerEnter(): void {
		clearAutoHide();
	}

	function handlePointerLeave(): void {
		if (visible && !pinned) {
			scheduleAutoHide();
		}
	}

	onDestroy(() => {
		clearAutoHide();
	});
</script>

<div class="config-stack">
	<button
		class="config-toggle"
		type="button"
		data-testid="config-stack-toggle"
		aria-pressed={visible}
		aria-label="Toggle chart configuration"
		onclick={handleToggle}
	>
		⚙
	</button>

	{#if visible}
		<div
			class={`config-surface${pinned ? ' pinned' : ''}`}
			data-testid="config-stack-surface"
			onpointerenter={handlePointerEnter}
			onpointerleave={handlePointerLeave}
		>
			<header class="config-header">
				<h2>Chart settings</h2>
				<div class="header-actions">
					<button
						type="button"
						class={`pin-button${pinned ? ' active' : ''}`}
						data-testid="config-stack-pin"
						onclick={handlePinToggle}
						aria-pressed={pinned}
						aria-label={pinned ? 'Unpin configuration stack' : 'Pin configuration stack'}
					>
						📌
					</button>
					<button type="button" class="reset-button" data-testid="config-stack-reset" onclick={handleReset}> Reset </button>
				</div>
			</header>
			<ConfigPanel chartId={chartId} state={state} on:change={handlePanelChange} />
		</div>
	{/if}
</div>

<style>
	.config-stack {
		position: absolute;
		top: var(--size-2-3);
		right: var(--size-2-3);
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--size-2-2);
		pointer-events: none;
		z-index: 5;
	}

	.config-toggle {
		pointer-events: auto;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.2);
		background: var(--bases-charts-surface, rgba(0, 0, 0, 0.4));
		color: var(--bases-charts-text, #ffffff);
		font-size: 16px;
		cursor: pointer;
	}

	.config-surface {
		pointer-events: auto;
		width: 280px;
		max-width: min(320px, 80vw);
		background: var(--bases-charts-surface, rgba(0, 0, 0, 0.75));
		color: var(--bases-charts-text, #ffffff);
		border-radius: var(--radius-m);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
		animation: fade-in 120ms ease-out;
	}

	.config-surface.pinned {
		border-color: rgba(255, 255, 255, 0.3);
	}

	.config-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--size-4-2) var(--size-4-3);
		background: rgba(0, 0, 0, 0.25);
	}

	.config-header h2 {
		margin: 0;
		font-size: var(--font-small);
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--size-2-2);
	}

	.pin-button,
	.reset-button {
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius-s);
		background: rgba(0, 0, 0, 0.2);
		color: inherit;
		padding: var(--size-2-1) var(--size-2-3);
		font-size: var(--font-small);
	}

	.pin-button.active {
		background: rgba(255, 255, 255, 0.15);
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
