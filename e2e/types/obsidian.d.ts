/**
 * Type definitions for Obsidian app object in browser environment
 * These types are needed for E2E testing where we access window.app
 */

declare global {
	interface Window {
		app?: {
			plugins?: {
				plugins?: {
					[pluginId: string]: {
						enabled: boolean;
						[key: string]: any;
					};
				};
			};
			workspace?: any;
			viewRegistry?: {
				viewByType?: {
					[viewType: string]: any;
				};
			};
		};
	}
}

export {};