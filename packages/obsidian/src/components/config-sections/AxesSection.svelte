<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { ChartConfig } from 'packages/obsidian/src/stores';

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
	 * Update axis configuration
	 */
	function updateAxis(updates: Partial<typeof config.axis>): void {
		try {
			configStore.update(current => ({
				...current,
				axis: { ...current.axis, ...updates },
			}));
		} catch (error) {
			console.error('Failed to update axis configuration:', error);
		}
	}

	/**
	 * Handle X-axis name change
	 */
	function handleXAxisNameChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ xAxisName: target.value });
	}

	/**
	 * Handle Y-axis name change
	 */
	function handleYAxisNameChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ yAxisName: target.value });
	}

	/**
	 * Handle X-axis visibility toggle
	 */
	function handleShowXAxisChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ showXAxis: target.checked });
	}

	/**
	 * Handle Y-axis visibility toggle
	 */
	function handleShowYAxisChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ showYAxis: target.checked });
	}

	/**
	 * Handle X-grid visibility toggle
	 */
	function handleShowXGridChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ showXGrid: target.checked });
	}

	/**
	 * Handle Y-grid visibility toggle
	 */
	function handleShowYGridChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ showYGrid: target.checked });
	}

	/**
	 * Handle X-labels rotation toggle
	 */
	function handleRotateXLabelsChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		updateAxis({ rotateXLabels: target.checked });
	}
</script>

<div class="config-section">
	<h4>X-Axis</h4>

	<div class="config-group">
		<label class="config-label">
			X-Axis Name
			<input type="text" class="text-input" value={config.axis.xAxisName} onchange={handleXAxisNameChange} placeholder="Enter X-axis label" />
		</label>

		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.axis.showXAxis} onchange={handleShowXAxisChange} />
			Show X-Axis
		</label>

		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.axis.showXGrid} onchange={handleShowXGridChange} />
			Show X-Grid Lines
		</label>

		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.axis.rotateXLabels} onchange={handleRotateXLabelsChange} />
			Rotate X-Labels (45°)
		</label>
	</div>

	<h4>Y-Axis</h4>

	<div class="config-group">
		<label class="config-label">
			Y-Axis Name
			<input type="text" class="text-input" value={config.axis.yAxisName} onchange={handleYAxisNameChange} placeholder="Enter Y-axis label" />
		</label>

		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.axis.showYAxis} onchange={handleShowYAxisChange} />
			Show Y-Axis
		</label>

		<label class="config-label checkbox-label">
			<input type="checkbox" class="checkbox-input" checked={config.axis.showYGrid} onchange={handleShowYGridChange} />
			Show Y-Grid Lines
		</label>
	</div>
</div>

<style>
	@import './config-styles.css';
</style>
