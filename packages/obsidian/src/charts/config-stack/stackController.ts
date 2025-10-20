import type { ConfigStackToggleDetail } from 'packages/obsidian/src/charts/config-stack/types';

type VisibilityReason = 'user' | 'auto-hide';

type VisibilityListener = (payload: StackVisibilitySnapshot) => void;

type AutoHideListener = (payload: { at: number }) => void;

export interface StackVisibilitySnapshot {
	visible: boolean;
	pinned: boolean;
	reason: VisibilityReason;
}

export interface StackControllerEventMap {
	'visibility-change': StackVisibilitySnapshot;
	'auto-hide-scheduled': { at: number };
}

export interface StackControllerOptions {
	autoHideMs: number;
	initialVisible?: boolean;
	initialPinned?: boolean;
}

export interface StackController {
	readonly snapshot: { visible: boolean; pinned: boolean };
	show(reason?: VisibilityReason): void;
	hide(reason?: VisibilityReason): void;
	toggle(): void;
	setPinned(pinned: boolean): void;
	scheduleAutoHide(): void;
	cancelAutoHide(): void;
	withAutoHide<T extends (...args: unknown[]) => unknown>(handler: T): T;
	emitVisibility(detail: ConfigStackToggleDetail): void;
	on<K extends keyof StackControllerEventMap>(event: K, listener: K extends 'visibility-change' ? VisibilityListener : AutoHideListener): void;
	off<K extends keyof StackControllerEventMap>(event: K, listener: K extends 'visibility-change' ? VisibilityListener : AutoHideListener): void;
	destroy(): void;
}

export function createStackController(options: StackControllerOptions): StackController {
	let visible = Boolean(options.initialVisible);
	let pinned = Boolean(options.initialPinned);
	let timer: ReturnType<typeof setTimeout> | null = null;
	const visibilityListeners = new Set<VisibilityListener>();
	const autoHideListeners = new Set<AutoHideListener>();

	function clearTimer(): void {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function emitVisibility(payload: StackVisibilitySnapshot): void {
		for (const listener of visibilityListeners) {
			listener(payload);
		}
	}

	function emitAutoHide(payload: { at: number }): void {
		for (const listener of autoHideListeners) {
			listener(payload);
		}
	}

	function schedule(): void {
		if (!visible || pinned || timer) {
			return;
		}
		const at = Date.now() + options.autoHideMs;
		emitAutoHide({ at });
		timer = setTimeout(() => {
			visible = false;
			emitVisibility({ visible, pinned, reason: 'auto-hide' });
			clearTimer();
		}, options.autoHideMs);
	}

	const controller: StackController = {
		get snapshot() {
			return { visible, pinned };
		},
		show(reason: VisibilityReason = 'user'): void {
			clearTimer();
			if (!visible) {
				visible = true;
				emitVisibility({ visible, pinned, reason });
			}
		},
		hide(reason: VisibilityReason = 'user'): void {
			clearTimer();
			if (visible) {
				visible = false;
				emitVisibility({ visible, pinned, reason });
			}
		},
		toggle(): void {
			if (visible) {
				controller.hide('user');
			} else {
				controller.show('user');
			}
		},
		setPinned(nextPinned: boolean): void {
			pinned = nextPinned;
			if (!pinned) {
				schedule();
			} else {
				clearTimer();
			}
		},
		scheduleAutoHide(): void {
			schedule();
		},
		cancelAutoHide(): void {
			clearTimer();
		},
		withAutoHide<T extends (...args: unknown[]) => unknown>(handler: T): T {
			return ((...args: unknown[]) => {
				clearTimer();
				schedule();
				return handler(...args);
			}) as T;
		},
		emitVisibility(detail: ConfigStackToggleDetail): void {
			emitVisibility({ visible: detail.visible, pinned: detail.pinned, reason: 'user' });
		},
		on(event, listener) {
			if (event === 'visibility-change') {
				visibilityListeners.add(listener as VisibilityListener);
			} else {
				autoHideListeners.add(listener as AutoHideListener);
			}
		},
		off(event, listener) {
			if (event === 'visibility-change') {
				visibilityListeners.delete(listener as VisibilityListener);
			} else {
				autoHideListeners.delete(listener as AutoHideListener);
			}
		},
		destroy(): void {
			clearTimer();
			visibilityListeners.clear();
			autoHideListeners.clear();
		},
	};

	return controller;
}
