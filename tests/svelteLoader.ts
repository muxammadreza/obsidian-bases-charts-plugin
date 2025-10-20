import { plugin } from 'bun';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve as resolvePath } from 'path';
import { compile } from 'svelte/compiler';
import { mock } from 'bun:test';

mock.module('svelte', () =>
	// @ts-expect-error - using internal client runtime path for tests
	import('../node_modules/svelte/src/index-client.js') as Promise<typeof import('svelte')>,
);
mock.module('svelte/internal', () =>
	// @ts-expect-error - using internal client runtime path for tests
	import('../node_modules/svelte/src/internal/client/index.js'),
);
mock.module('svelte/reactivity', () =>
	// @ts-expect-error - using internal client runtime path for tests
	import('../node_modules/svelte/src/reactivity/index-client.js'),
);

plugin({
	name: 'svelte loader',
	setup(builder) {
		const mockChartPanelPath = resolvePath(
			fileURLToPath(new URL('.', import.meta.url)),
			'mocks/MockChartPanel.svelte',
		);

		builder.onResolve({ filter: /^@ticatec\/uniface-echarts\/ChartPanel\.svelte$/ }, () => ({
			path: mockChartPanelPath,
		}));

		builder.onResolve({ filter: /^svelte$/ }, () => {
			const path = resolvePath(fileURLToPath(new URL('../node_modules/svelte/src/index-client.js', import.meta.url)));
			return { path };
		});

		builder.onResolve({ filter: /^svelte\/reactivity$/ }, () => {
			const path = resolvePath(fileURLToPath(new URL('../node_modules/svelte/src/reactivity/index-client.js', import.meta.url)));
			return { path };
		});

		builder.onResolve({ filter: /^svelte\/internal$/ }, () => {
			const path = resolvePath(fileURLToPath(new URL('../node_modules/svelte/src/internal/client/index.js', import.meta.url)));
			return { path };
		});
		builder.onLoad({ filter: /\.svelte(\?[^.]+)?$/ }, ({ path }) => {
			try {
				const source = readFileSync(path.substring(0, path.includes('?') ? path.indexOf('?') : path.length), 'utf-8');

				const result = compile(source, {
					filename: path,
					generate: 'client',
					dev: true,
					compatibility: {
						componentApi: 4,
					},
				});

				return {
					contents: result.js.code,
					loader: 'js',
				};
			} catch (err) {
				if (err instanceof Error) {
					throw new Error(`Failed to compile Svelte component: ${err.message}`);
				} else {
					throw new Error(`Failed to compile Svelte component`);
				}
			}
		});
	},
});
