/**
 * Panel state management for configuration panel
 * Handles visibility, position, and panel-specific state
 */

import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { z } from 'zod';

// Panel position schema
export const PanelPositionSchema = z
	.object({
		x: z.number().default(100),
		y: z.number().default(100),
		width: z.number().min(200).max(800).default(320),
		height: z.number().min(300).max(600).default(480),
	})
	.default({
		x: 100,
		y: 100,
		width: 320,
		height: 480,
	});

// Panel state schema
export const PanelStateSchema = z
	.object({
		visible: z.boolean().default(false),
		position: PanelPositionSchema,
		collapsed: z.boolean().default(false),
		activeSection: z.string().default('chartType'),
	})
	.default({
		visible: false,
		position: PanelPositionSchema.parse({}),
		collapsed: false,
		activeSection: 'chartType',
	});

// TypeScript types
export type PanelPosition = z.infer<typeof PanelPositionSchema>;
export type PanelState = z.infer<typeof PanelStateSchema>;

// Default panel state
export const defaultPanelState: PanelState = PanelStateSchema.parse({});

/**
 * Creates a panel state store with validation
 * @param initialState - Optional initial state
 * @returns Writable store with validation
 */
export function createPanelStateStore(initialState?: Partial<PanelState>): Writable<PanelState> {
	const state = { ...defaultPanelState, ...initialState };
	const validatedState = PanelStateSchema.parse(state);

	const store = writable<PanelState>(validatedState);

	// Add validation on updates
	const { subscribe, set, update } = store;

	return {
		subscribe,
		set: (value: PanelState): void => {
			try {
				const validated = PanelStateSchema.parse(value);
				set(validated);
			} catch (error) {
				console.error('Invalid panel state:', error);
				// Keep current value on validation error
			}
		},
		update: (updater: (value: PanelState) => PanelState): void => {
			update(current => {
				try {
					const newValue = updater(current);
					return PanelStateSchema.parse(newValue);
				} catch (error) {
					console.error('Invalid panel state update:', error);
					return current;
				}
			});
		},
	};
}

/**
 * Creates a panel state store with persistence
 * @param storageKey - Key for localStorage persistence
 * @param initialState - Initial state
 * @returns Panel state store with persistence
 */
export function createPersistedPanelStateStore(storageKey: string, initialState?: Partial<PanelState>): Writable<PanelState> {
	// Try to load from localStorage
	let savedState: Partial<PanelState> = {};
	try {
		const saved = localStorage.getItem(storageKey);
		if (saved) {
			savedState = JSON.parse(saved) as Partial<PanelState>;
		}
	} catch (error) {
		console.warn('Failed to load saved panel state:', error);
	}

	// Merge saved state with initial state
	const state = { ...defaultPanelState, ...savedState, ...initialState };
	const store = createPanelStateStore(state);

	// Save to localStorage on changes
	store.subscribe(value => {
		try {
			localStorage.setItem(storageKey, JSON.stringify(value));
		} catch (error: unknown) {
			console.warn('Failed to save panel state:', error);
		}
	});

	return store;
}

/**
 * Helper functions for panel state management
 */
export const panelStateHelpers = {
	/**
	 * Toggle panel visibility
	 */
	toggleVisibility: (store: Writable<PanelState>): void => {
		store.update(state => ({ ...state, visible: !state.visible }));
	},

	/**
	 * Show panel
	 */
	show: (store: Writable<PanelState>): void => {
		store.update(state => ({ ...state, visible: true }));
	},

	/**
	 * Hide panel
	 */
	hide: (store: Writable<PanelState>): void => {
		store.update(state => ({ ...state, visible: false }));
	},

	/**
	 * Toggle collapsed state
	 */
	toggleCollapsed: (store: Writable<PanelState>): void => {
		store.update(state => ({ ...state, collapsed: !state.collapsed }));
	},

	/**
	 * Set active section
	 */
	setActiveSection: (store: Writable<PanelState>, section: string): void => {
		store.update(state => ({ ...state, activeSection: section }));
	},

	/**
	 * Update panel position
	 */
	updatePosition: (store: Writable<PanelState>, position: Partial<PanelPosition>): void => {
		store.update(state => ({
			...state,
			position: { ...state.position, ...position },
		}));
	},

	/**
	 * Reset panel to default state
	 */
	reset: (store: Writable<PanelState>): void => {
		store.set(defaultPanelState);
	},
};
