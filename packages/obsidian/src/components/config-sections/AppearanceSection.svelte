<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { ChartConfig, ColorConfig } from 'packages/obsidian/src/stores';

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
	 * Update color configuration
	 */
	function updateColors(updates: Partial<ColorConfig>): void {
		try {
			configStore.update(current => ({
				...current,
				colors: { ...current.colors, ...updates },
			}));
		} catch (error) {
			console.error('Failed to update color configuration:', error);
		}
	}

	/**
	 * Update typography configuration
	 */
	function updateTypography(updates: Partial<typeof config.typography>): void {
		try {
			configStore.update(current => ({
				...current,
				typography: { ...current.typography, ...updates },
			}));
		} catch (error) {
			console.error('Failed to update typography configuration:', error);
		}
	}

	/**
	 * Handle color input change
	 */
	function handleColorChange(colorKey: keyof ColorConfig, event: Event): void {
		const target = event.target as HTMLInputElement;
		updateColors({ [colorKey]: target.value });
	}

	/**
	 * Handle font size change
	 */
	function handleFontSizeChange(event: Event): void {
		const target = event.target as HTMLInputElement;
		const fontSize = parseInt(target.value, 10);
		if (!isNaN(fontSize) && fontSize > 0) {
			updateTypography({ fontSize });
		}
	}

	/**
	 * Handle font family change
	 */
	function handleFontFamilyChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		updateTypography({ fontFamily: target.value });
	}

	/**
	 * Handle font weight change
	 */
	function handleFontWeightChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		updateTypography({ fontWeight: target.value as 'normal' | 'bold' });
	}
</script>

<div class="config-section">
	<h4>Colors & Theme</h4>

	<div class="config-group">
		<label class="config-label">
			Primary Color
			<input type="color" class="color-input" value={config.colors.primary} onchange={event => handleColorChange('primary', event)} />
		</label>

		<label class="config-label">
			Secondary Color
			<input type="color" class="color-input" value={config.colors.secondary} onchange={event => handleColorChange('secondary', event)} />
		</label>

		<label class="config-label">
			Background Color
			<input type="color" class="color-input" value={config.colors.background} onchange={event => handleColorChange('background', event)} />
		</label>

		<label class="config-label">
			Text Color
			<input type="color" class="color-input" value={config.colors.text} onchange={event => handleColorChange('text', event)} />
		</label>

		<label class="config-label">
			Grid Color
			<input type="color" class="color-input" value={config.colors.grid} onchange={event => handleColorChange('grid', event)} />
		</label>
	</div>

	<h4>Typography</h4>

	<div class="config-group">
		<label class="config-label">
			Font Family
			<select class="select-input" value={config.typography.fontFamily} onchange={handleFontFamilyChange}>
				<option value="system-ui, -apple-system, sans-serif">System Default</option>
				<option value="Arial, sans-serif">Arial</option>
				<option value="Helvetica, sans-serif">Helvetica</option>
				<option value="Georgia, serif">Georgia</option>
				<option value="Times New Roman, serif">Times New Roman</option>
				<option value="Courier New, monospace">Courier New</option>
				<option value="Monaco, monospace">Monaco</option>
			</select>
		</label>

		<label class="config-label">
			Font Size
			<input type="number" class="number-input" min="8" max="24" value={config.typography.fontSize} onchange={handleFontSizeChange} />
		</label>

		<label class="config-label">
			Font Weight
			<select class="select-input" value={config.typography.fontWeight} onchange={handleFontWeightChange}>
				<option value="normal">Normal</option>
				<option value="bold">Bold</option>
			</select>
		</label>
	</div>
</div>

<style>
	@import './config-styles.css';
</style>
