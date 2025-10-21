/**
 * Debounce utility for delaying function execution
 * Useful for preventing excessive chart updates during rapid configuration changes
 */

/**
 * Creates a debounced version of a function
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: never[]) => void>(func: T, delay: number): T {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return ((...args: Parameters<T>) => {
		// Clear existing timeout
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		// Set new timeout
		timeoutId = setTimeout(() => {
			func(...args);
			timeoutId = null;
		}, delay);
	}) as T;
}

/**
 * Creates a debounced version of a function that can be cancelled
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Object with debounced function and cancel method
 */
export function debounceCancellable<T extends (...args: never[]) => void>(
	func: T,
	delay: number,
): {
	debounced: T;
	cancel: () => void;
} {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const cancel = (): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	const debounced = ((...args: Parameters<T>) => {
		cancel();
		timeoutId = setTimeout(() => {
			func(...args);
			timeoutId = null;
		}, delay);
	}) as T;

	return { debounced, cancel };
}

/**
 * Creates a throttled version of a function
 * @param func - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: never[]) => void>(func: T, delay: number): T {
	let lastCall = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return ((...args: Parameters<T>) => {
		const now = Date.now();

		if (now - lastCall >= delay) {
			// Execute immediately if enough time has passed
			lastCall = now;
			func(...args);
		} else {
			// Schedule execution for later if not already scheduled
			timeoutId ??= setTimeout(
				() => {
					lastCall = Date.now();
					func(...args);
					timeoutId = null;
				},
				delay - (now - lastCall),
			);
		}
	}) as T;
}

/**
 * Default debounce delay for configuration updates (in milliseconds)
 */
export const DEFAULT_CONFIG_DEBOUNCE_DELAY = 150;

/**
 * Default throttle delay for rapid updates (in milliseconds)
 */
export const DEFAULT_THROTTLE_DELAY = 100;
