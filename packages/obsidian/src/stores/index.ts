/**
 * Chart configuration and state management stores
 * Provides reactive state management using Svelte stores with type safety and validation
 */

// Chart configuration stores
export {
	createChartConfigStore,
	createDerivedConfigStores,
	createEChartsThemeStore,
	createPersistedConfigStore,
	validateConfigUpdate,
	defaultChartConfig,
	ChartConfigSchema,
	ColorConfigSchema,
	TypographyConfigSchema,
	AxisConfigSchema,
	LegendConfigSchema,
	AnimationConfigSchema,
	InteractionConfigSchema,
	type ChartConfig,
	type ColorConfig,
	type TypographyConfig,
	type AxisConfig,
	type LegendConfig,
	type AnimationConfig,
	type InteractionConfig,
} from './chartConfig';

// Panel state stores
export {
	createPanelStateStore,
	createPersistedPanelStateStore,
	panelStateHelpers,
	defaultPanelState,
	PanelStateSchema,
	PanelPositionSchema,
	type PanelState,
	type PanelPosition,
} from './panelState';
