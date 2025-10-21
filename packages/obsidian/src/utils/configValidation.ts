/**
 * Configuration validation utilities for chart configuration
 * Provides validation and error handling for chart configuration updates
 */

import type { ChartConfig } from 'packages/obsidian/src/stores';
import {
	ChartConfigSchema,
	ColorConfigSchema,
	TypographyConfigSchema,
	AxisConfigSchema,
	LegendConfigSchema,
	AnimationConfigSchema,
	InteractionConfigSchema,
} from 'packages/obsidian/src/stores';

/**
 * Validates a chart configuration object
 * @param config - Configuration to validate
 * @returns Validation result with success flag and errors
 */
export function validateChartConfig(config: unknown): {
	success: boolean;
	data?: ChartConfig;
	errors?: string[];
} {
	try {
		const validatedConfig = ChartConfigSchema.parse(config);
		return {
			success: true,
			data: validatedConfig,
		};
	} catch (error) {
		const errors: string[] = [];

		if (error instanceof Error) {
			// Parse Zod error for better error messages
			try {
				const zodError = JSON.parse(error.message) as unknown;
				if (Array.isArray(zodError)) {
					errors.push(...zodError.map((err: { message: string; path: string[] }) => `${err.path.join('.')}: ${err.message}`));
				} else {
					errors.push(error.message);
				}
			} catch {
				errors.push(error.message);
			}
		} else {
			errors.push('Unknown validation error');
		}

		return {
			success: false,
			errors,
		};
	}
}

/**
 * Safely merges a partial configuration with a base configuration
 * @param baseConfig - Base configuration
 * @param partialConfig - Partial configuration to merge
 * @returns Merged and validated configuration or null if invalid
 */
export function safeConfigMerge(baseConfig: ChartConfig, partialConfig: Partial<ChartConfig>): ChartConfig | null {
	try {
		// Deep merge configurations
		const merged = deepMerge(baseConfig, partialConfig);

		// Validate the merged result
		const validation = validateChartConfig(merged);

		if (validation.success && validation.data) {
			return validation.data;
		} else {
			console.error('Configuration merge validation failed:', validation.errors);
			return null;
		}
	} catch (error) {
		console.error('Configuration merge failed:', error);
		return null;
	}
}

/**
 * Deep merge utility for configuration objects
 * @param target - Target object
 * @param source - Source object to merge
 * @returns Merged object
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
	const result = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key];
			const targetValue = result[key];

			if (
				sourceValue &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				// Recursively merge objects
				result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>) as T[Extract<keyof T, string>];
			} else {
				// Direct assignment for primitives and arrays
				result[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}
	}

	return result;
}

/**
 * Creates a safe configuration updater function
 * @param onError - Error handler function
 * @returns Configuration updater function
 */
export function createSafeConfigUpdater(onError?: (errors: string[]) => void): (baseConfig: ChartConfig, update: Partial<ChartConfig>) => ChartConfig {
	return (baseConfig: ChartConfig, update: Partial<ChartConfig>): ChartConfig => {
		const merged = safeConfigMerge(baseConfig, update);

		if (merged) {
			return merged;
		} else {
			// Return base config on error
			if (onError) {
				onError(['Failed to merge configuration update']);
			}
			return baseConfig;
		}
	};
}

/**
 * Validates specific configuration sections
 */
export const sectionValidators = {
	/**
	 * Validates color configuration
	 */
	colors: (colors: unknown): boolean => {
		try {
			ColorConfigSchema.parse(colors);
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Validates typography configuration
	 */
	typography: (typography: unknown): boolean => {
		try {
			TypographyConfigSchema.parse(typography);
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Validates axis configuration
	 */
	axis: (axis: unknown): boolean => {
		try {
			AxisConfigSchema.parse(axis);
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Validates legend configuration
	 */
	legend: (legend: unknown): boolean => {
		try {
			LegendConfigSchema.parse(legend);
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Validates animation configuration
	 */
	animation: (animation: unknown): boolean => {
		try {
			AnimationConfigSchema.parse(animation);
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Validates interaction configuration
	 */
	interaction: (interaction: unknown): boolean => {
		try {
			InteractionConfigSchema.parse(interaction);
			return true;
		} catch {
			return false;
		}
	},
};
