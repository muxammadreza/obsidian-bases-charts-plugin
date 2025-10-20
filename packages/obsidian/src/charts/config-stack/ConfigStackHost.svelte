<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import ConfigPanel from 'packages/obsidian/src/charts/config-stack/ConfigPanel.svelte';
	import { applyPatchToState, cloneConfigStackState } from 'packages/obsidian/src/charts/config-stack/state';
	import { createStackController } from 'packages/obsidian/src/charts/config-stack/stackController';
	import type {
		ConfigStackApplyDetail,
		ConfigStackPatch,
		ConfigStackRevertDetail,
		ConfigStackState,
		ConfigStackToggleDetail,
	} from 'packages/obsidian/src/charts/config-stack/types';

	interface Props {
		chartId: string;
		initialState: ConfigStackState;
		autoHideMs?: number;
	}

	let { chartId, initialState, autoHideMs = 3000 }: Props = $props();

	const dispatch = createEventDispatcher<{
		toggle: ConfigStackToggleDetail;
		applyConfig: ConfigStackApplyDetail;
		revert: ConfigStackRevertDetail;
	}>();

	let baseline = $state(cloneConfigStackState(initialState));
	let stackState = $state(cloneConfigStackState(initialState));
	let visible = $state(false);
	let pinned = $state(false);
	let controller = createStackController({ autoHideMs, initialVisible: false, initialPinned: false });

	controller.on('visibility-change', snapshot => {
		visible = snapshot.visible;
		pinned = snapshot.pinned;
	});

	function refreshBaseline(next: ConfigStackState): void {
		baseline = cloneConfigStackState(next);
		if (!visible) {
			stackState = cloneConfigStackState(next);
		}
	}

	$effect(() => {
		refreshBaseline(initialState);
	});

	function emitToggle(): void {
		dispatch('toggle', {
			chartId,
			visible,
			pinned,
		});
	}

	function handleToggle(): void {
		const isVisible = controller.snapshot.visible;
		if (isVisible) {
			controller.hide('user');
		} else {
			controller.show('user');
			if (!controller.snapshot.pinned) {
				controller.scheduleAutoHide();
			}
		}
		emitToggle();
	}

	function handlePinToggle(): void {
		controller.setPinned(!pinned);
		emitToggle();
	}

	function handleApply(event: CustomEvent<ConfigStackPatch>): void {
		stackState = applyPatchToState(stackState, event.detail);
		dispatch('applyConfig', {
			chartId,
			state: stackState,
			patch: event.detail,
		});
		controller.cancelAutoHide();
		if (!pinned) {
			controller.scheduleAutoHide();
		}
	}

	function handleReset(): void {
		stackState = cloneConfigStackState(baseline);
		dispatch('revert', {
			chartId,
			state: stackState,
		});
		controller.cancelAutoHide();
		if (!pinned) {
			controller.scheduleAutoHide();
		}
	}

	function handlePointerEnter(): void {
		controller.cancelAutoHide();
	}

	function handlePointerLeave(): void {
		if (!pinned) {
			controller.scheduleAutoHide();
		}
	}

	onDestroy(() => {
		controller.destroy();
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
					<button type="button" class="reset-button" data-testid="config-stack-reset" onclick={handleReset}>
						Reset
					</button>
				</div>
			</header>
			<ConfigPanel chartId={chartId} state={stackState} on:change={handleApply} />
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
