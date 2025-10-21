<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { ChartConfig } from 'packages/obsidian/src/stores';
	import './section-title.css';

	interface Props {
		configStore: Writable<ChartConfig>;
	}

	let { configStore }: Props = $props();

	// Reactive config state
	let config = $state($configStore);

	// Subscribe to config changes
	$effect(() => {
		const unsubscribe = configStore.subscribe(value => {
			config = value;
		});
		return unsubscribe;
	});

	/**
	 * Update legend configuration
	 */
	function updateLegend(updates: Partial<typeof config.legend>): void {
		try {
			configStore.update(current => ({
				...current,
				legend: { ...current.legend, ...updates },
			}));
		} catch (error) {
			console.error('Failed to update legend configuration:', error);
		}
	}

	/**
	 * Update animation configuration
	 */
	function updateAnimation(updates: Partial<typeof config.animation>): void {
		try {
			configStore.update(current => ({
				...current,
				animation: { ...current.animation, ...updates },
			}));
		} catch (error) {
			console.error('Failed to update animation configuration:', error);
		}
	}

	/**
	 * Handle legend show toggle
	 */
	function handleLegendShowChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateLegend({ show: target.checked });
	}

	/**
	 * Handle legend position change
	 */
	function handleLegendPositionChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		updateLegend({ position: target.value as 'top' | 'bottom' | 'left' | 'right' });
	}

	/**
	 * Handle legend orientation change
	 */
	function handleLegendOrientChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		updateLegend({ orient: target.value as 'horizontal' | 'vertical' });
	}

	/**
	 * Handle animation enabled toggle
	 */
	function handleAnimationEnabledChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAnimation({ enabled: target.checked });
	}

	/**
	 * Handle animation duration change
	 */
	function handleAnimationDurationChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		const duration = parseInt(target.value, 10);
		if (!isNaN(duration) && duration >= 0) {
			updateAnimation({ duration });
		}
	}

	/**
	 * Handle animation easing change
	 */
	function handleAnimationEasingChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		updateAnimation({ easing: target.value as typeof config.animation.easing });
	}
</script>

<div class="config-section">
	<h4>Legend</h4>

	<div class="config-group">
		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.legend.show} onchange={handleLegendShowChange} />
			Show Legend
		</label>

		{#if config.legend.show}
			<label class="config-label">
				Position
				<select class="select-input" value={config.legend.position} onchange={handleLegendPositionChange}>
					<option value="top">Top</option>
					<option value="bottom">Bottom</option>
					<option value="left">Left</option>
					<option value="right">Right</option>
				</select>
			</label>

			<label class="config-label">
				Orientation
				<select class="select-input" value={config.legend.orient} onchange={handleLegendOrientChange}>
					<option value="horizontal">Horizontal</option>
					<option value="vertical">Vertical</option>
				</select>
			</label>
		{/if}
	</div>

	<h4>Animation</h4>

	<div class="config-group">
		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.animation.enabled} onchange={handleAnimationEnabledChange} />
			Enable Animations
		</label>

		{#if config.animation.enabled}
			<label class="config-label">
				Duration (ms)
				<input
					type="number"
					class="number-input"
					min="0"
					max="5000"
					step="100"
					value={config.animation.duration}
					onchange={handleAnimationDurationChange}
				/>
			</label>

			<label class="config-label">
				Easing
				<select class="select-input" value={config.animation.easing} onchange={handleAnimationEasingChange}>
					<option value="linear">Linear</option>
					<option value="quadraticIn">Quadratic In</option>
					<option value="quadraticOut">Quadratic Out</option>
					<option value="quadraticInOut">Quadratic In-Out</option>
					<option value="cubicIn">Cubic In</option>
					<option value="cubicOut">Cubic Out</option>
					<option value="cubicInOut">Cubic In-Out</option>
					<option value="quarticIn">Quartic In</option>
					<option value="quarticOut">Quartic Out</option>
					<option value="quarticInOut">Quartic In-Out</option>
					<option value="quinticIn">Quintic In</option>
					<option value="quinticOut">Quintic Out</option>
					<option value="quinticInOut">Quintic In-Out</option>
					<option value="sinusoidalIn">Sinusoidal In</option>
					<option value="sinusoidalOut">Sinusoidal Out</option>
					<option value="sinusoidalInOut">Sinusoidal In-Out</option>
					<option value="exponentialIn">Exponential In</option>
					<option value="exponentialOut">Exponential Out</option>
					<option value="exponentialInOut">Exponential In-Out</option>
					<option value="circularIn">Circular In</option>
					<option value="circularOut">Circular Out</option>
					<option value="circularInOut">Circular In-Out</option>
					<option value="elasticIn">Elastic In</option>
					<option value="elasticOut">Elastic Out</option>
					<option value="elasticInOut">Elastic In-Out</option>
					<option value="backIn">Back In</option>
					<option value="backOut">Back Out</option>
					<option value="backInOut">Back In-Out</option>
					<option value="bounceIn">Bounce In</option>
					<option value="bounceOut">Bounce Out</option>
					<option value="bounceInOut">Bounce In-Out</option>
				</select>
			</label>
		{/if}
	</div>
</div>

<style>
	@import './config-styles.css';
</style>
