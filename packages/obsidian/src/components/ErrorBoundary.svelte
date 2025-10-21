<script lang="ts">
	interface Props {
		fallback?: string;
		onError?: (error: Error) => void;
		children?: import('svelte').Snippet;
	}

	let { fallback = 'Something went wrong', onError, children }: Props = $props();

	let hasError = $state(false);
	let error: Error | null = $state(null);

	/**
	 * Handle errors from child components
	 */
	function handleError(event: ErrorEvent | PromiseRejectionEvent): void {
		const errorObj = 'error' in event ? event.error : event.reason;

		if (errorObj instanceof Error) {
			error = errorObj;
			hasError = true;

			if (onError) {
				onError(errorObj);
			}

			console.error('Error caught by ErrorBoundary:', errorObj);
		}
	}

	/**
	 * Reset error state
	 */
	function resetError(): void {
		hasError = false;
		error = null;
	}

	// Listen for errors
	if (typeof window !== 'undefined') {
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleError);
	}
</script>

{#if hasError && error}
	<div class="error-boundary">
		<div class="error-content">
			<h3>Configuration Error</h3>
			<p>{fallback}</p>
			<details class="error-details">
				<summary>Error Details</summary>
				<pre>{error.message}</pre>
				{#if error.stack}
					<pre class="error-stack">{error.stack}</pre>
				{/if}
			</details>
			<button class="retry-button" onclick={resetError}> Try Again </button>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}

<style>
	.error-boundary {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		padding: 20px;
		background: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 8px;
	}

	.error-content {
		text-align: center;
		max-width: 400px;
	}

	.error-content h3 {
		margin: 0 0 12px 0;
		color: var(--text-error);
		font-size: 16px;
		font-weight: 600;
	}

	.error-content p {
		margin: 0 0 16px 0;
		color: var(--text-muted);
		font-size: 14px;
		line-height: 1.4;
	}

	.error-details {
		margin: 16px 0;
		text-align: left;
	}

	.error-details summary {
		cursor: pointer;
		color: var(--text-muted);
		font-size: 12px;
		margin-bottom: 8px;
	}

	.error-details summary:hover {
		color: var(--text-normal);
	}

	.error-details pre {
		background: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		border-radius: 4px;
		padding: 8px;
		font-size: 11px;
		color: var(--text-muted);
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.error-stack {
		max-height: 150px;
		overflow-y: auto;
	}

	.retry-button {
		background: var(--interactive-accent);
		color: var(--text-on-accent);
		border: none;
		border-radius: 4px;
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.retry-button:hover {
		background: var(--interactive-accent-hover);
	}

	.retry-button:focus {
		outline: 2px solid var(--text-accent);
		outline-offset: 2px;
	}
</style>
