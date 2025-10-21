/**
 * Chart configuration stores using Svelte stores for reactive state management
 * Provides type-safe configuration with automatic chart updates via invalidate()
 */

import type { Writable, Readable } from 'svelte/store';
import { writable, derived } from 'svelte/store';
import { z } from 'zod';

// Configuration schemas for validation
export const ColorConfigSchema = z.object({
	primary: z.string().default('#3b82f6'),
	secondary: z.string().default('#ef4444'),
	background: z.string().default('transparent'),
	text: z.string().default('#374151'),
	grid: z.string().default('#e5e7eb'),
});

export const TypographyConfigSchema = z.object({
	fontFamily: z.string().default('system-ui, -apple-system, sans-serif'),
	fontSize: z.number().min(8).max(24).default(12),
	fontWeight: z.enum(['normal', 'bold']).default('normal'),
	titleSize: z.number().min(12).max(32).default(16),
});

export const AxisConfigSchema = z.object({
	showXAxis: z.boolean().default(true),
	showYAxis: z.boolean().default(true),
	showXGrid: z.boolean().default(true),
	showYGrid: z.boolean().default(true),
	xAxisName: z.string().default('X'),
	yAxisName: z.string().default('Y'),
	rotateXLabels: z.boolean().default(false),
});

export const LegendConfigSchema = z.object({
	show: z.boolean().default(true),
	position: z.enum(['top', 'bottom', 'left', 'right']).default('top'),
	orient: z.enum(['horizontal', 'vertical']).default('horizontal'),
});

export const AnimationConfigSchema = z.object({
	enabled: z.boolean().default(true),
	duration: z.number().min(0).max(3000).default(300),
	easing: z.enum(['linear', 'quadraticIn', 'quadraticOut', 'cubicInOut']).default('cubicInOut'),
});

export const InteractionConfigSchema = z.object({
	enableZoom: z.boolean().default(true),
	enablePan: z.boolean().default(true),
	enableBrush: z.boolean().default(false),
	enableDataZoom: z.boolean().default(false),
});

// Main chart configuration schema
export const ChartConfigSchema = z.object({
	colors: ColorConfigSchema,
	typography: TypographyConfigSchema,
	axis: AxisConfigSchema,
	legend: LegendConfigSchema,
	animation: AnimationConfigSchema,
	interaction: InteractionConfigSchema,
});

// TypeScript types derived from schemas
export type ColorConfig = z.infer<typeof ColorConfigSchema>;
export type TypographyConfig = z.infer<typeof TypographyConfigSchema>;
export type AxisConfig = z.infer<typeof AxisConfigSchema>;
export type LegendConfig = z.infer<typeof LegendConfigSchema>;
export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;
export type InteractionConfig = z.infer<typeof InteractionConfigSchema>;
export type ChartConfig = z.infer<typeof ChartConfigSchema>;

// Default configuration
export const defaultChartConfig: ChartConfig = ChartConfigSchema.parse({});

/**
 * Creates a new chart configuration store with validation
 * @param initialConfig - Optional initial configuration
 * @returns Writable store with validation
 */
export function createChartConfigStore(initialConfig?: Partial<ChartConfig>): Writable<ChartConfig> {
	const config = { ...defaultChartConfig, ...initialConfig };
	const validatedConfig = ChartConfigSchema.parse(config);

	const store = writable<ChartConfig>(validatedConfig);

	// Add validation on updates
	const { subscribe, set, update } = store;

	return {
		subscribe,
		set: (value: ChartConfig): void => {
			try {
				const validated = ChartConfigSchema.parse(value);
				set(validated);
			} catch (error) {
				console.error('Invalid chart configuration:', error);
				// Keep current value on validation error
			}
		},
		update: (updater: (value: ChartConfig) => ChartConfig): void => {
			update(current => {
				try {
					const newValue = updater(current);
					return ChartConfigSchema.parse(newValue);
				} catch (error) {
					console.error('Invalid chart configuration update:', error);
					return current;
				}
			});
		},
	};
}

/**
 * Creates derived stores for specific configuration sections
 * @param configStore - Main configuration store
 * @returns Object with derived stores for each section
 */
export function createDerivedConfigStores(configStore: Readable<ChartConfig>): {
	colors: Readable<ColorConfig>;
	typography: Readable<TypographyConfig>;
	axis: Readable<AxisConfig>;
	legend: Readable<LegendConfig>;
	animation: Readable<AnimationConfig>;
	interaction: Readable<InteractionConfig>;
} {
	return {
		colors: derived(configStore, $config => $config.colors),
		typography: derived(configStore, $config => $config.typography),
		axis: derived(configStore, $config => $config.axis),
		legend: derived(configStore, $config => $config.legend),
		animation: derived(configStore, $config => $config.animation),
		interaction: derived(configStore, $config => $config.interaction),
	};
}

/**
 * Creates a derived store for ECharts theme configuration
 * @param configStore - Main configuration store
 * @returns Derived store with ECharts theme object
 */
export function createEChartsThemeStore(configStore: Readable<ChartConfig>): Readable<Record<string, unknown>> {
	return derived(configStore, $config => ({
		color: [$config.colors.primary, $config.colors.secondary, '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'],
		backgroundColor: $config.colors.background,
		textStyle: {
			fontFamily: $config.typography.fontFamily,
			fontSize: $config.typography.fontSize,
			fontWeight: $config.typography.fontWeight,
			color: $config.colors.text,
		},
		title: {
			textStyle: {
				fontSize: $config.typography.titleSize,
				fontWeight: $config.typography.fontWeight,
				color: $config.colors.text,
			},
		},
		legend: {
			textStyle: {
				color: $config.colors.text,
			},
		},
		categoryAxis: {
			axisLine: {
				lineStyle: {
					color: $config.colors.grid,
				},
			},
			axisTick: {
				lineStyle: {
					color: $config.colors.grid,
				},
			},
			axisLabel: {
				color: $config.colors.text,
			},
			splitLine: {
				lineStyle: {
					color: $config.colors.grid,
				},
			},
		},
		valueAxis: {
			axisLine: {
				lineStyle: {
					color: $config.colors.grid,
				},
			},
			axisTick: {
				lineStyle: {
					color: $config.colors.grid,
				},
			},
			axisLabel: {
				color: $config.colors.text,
			},
			splitLine: {
				lineStyle: {
					color: $config.colors.grid,
				},
			},
		},
	}));
}

/**
 * Validates a partial configuration update
 * @param partialConfig - Partial configuration to validate
 * @param currentConfig - Current configuration for merging
 * @returns Validated merged configuration or null if invalid
 */
export function validateConfigUpdate(partialConfig: Partial<ChartConfig>, currentConfig: ChartConfig): ChartConfig | null {
	try {
		const merged = { ...currentConfig, ...partialConfig };
		return ChartConfigSchema.parse(merged);
	} catch (error) {
		console.error('Configuration validation failed:', error);
		return null;
	}
}

/**
 * Creates a configuration store with persistence support
 * @param storageKey - Key for localStorage persistence
 * @param initialConfig - Initial configuration
 * @returns Configuration store with persistence
 */
export function createPersistedConfigStore(storageKey: string, initialConfig?: Partial<ChartConfig>): Writable<ChartConfig> {
	// Try to load from localStorage
	let savedConfig: Partial<ChartConfig> = {};
	try {
		const saved = localStorage.getItem(storageKey);
		if (saved) {
			savedConfig = JSON.parse(saved) as Partial<ChartConfig>;
		}
	} catch (error) {
		console.warn('Failed to load saved configuration:', error);
	}

	// Merge saved config with initial config
	const config = { ...defaultChartConfig, ...savedConfig, ...initialConfig };
	const store = createChartConfigStore(config);

	// Save to localStorage on changes
	store.subscribe(value => {
		try {
			localStorage.setItem(storageKey, JSON.stringify(value));
		} catch (error: unknown) {
			console.warn('Failed to save configuration:', error);
		}
	});

	return store;
}
