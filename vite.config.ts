import { UserConfig, defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import banner from 'vite-plugin-banner';
import path from 'path';
import builtins from 'builtin-modules';
import { getBuildBanner } from './automation/build/buildBanner';

const entryFile = 'packages/obsidian/src/main.ts';

export default defineConfig(async ({ mode }) => {
	const { resolve } = path;
	const prod = mode === 'production';
	const outDir = prod ? 'dist' : 'dist/dev';

	let plugins = [
		svelte(),
		banner({
			outDir: outDir,
			content: getBuildBanner(prod ? 'Release Build' : 'Dev Build', version => version),
		}),
		viteStaticCopy({
			targets: [
				{
					src: 'manifest.json',
					dest: '',
				},
			],
		}),
	];

	return {
		plugins: plugins,
		resolve: {
			alias: {
				packages: path.resolve(__dirname, './packages'),
			},
		},
		build: {
			lib: {
				entry: resolve(__dirname, entryFile),
				name: 'main',
				fileName: () => 'main.js',
				formats: ['cjs'],
			},
			minify: prod,
			sourcemap: prod ? false : 'inline',
			cssCodeSplit: false,
			emptyOutDir: false,
			outDir: outDir,
			// Ensure single file output for Obsidian
			rollupOptions: {
				output: {
					assetFileNames: 'styles.css',
					entryFileNames: 'main.js',
					// Disable code splitting for Obsidian plugins
					manualChunks: undefined,
					inlineDynamicImports: true,
					// Ensure proper CommonJS export for Obsidian
					exports: 'default',
					format: 'cjs',
				},
				external: [
					'obsidian',
					'electron',
					'@codemirror/autocomplete',
					'@codemirror/collab',
					'@codemirror/commands',
					'@codemirror/language',
					'@codemirror/lint',
					'@codemirror/search',
					'@codemirror/state',
					'@codemirror/view',
					'@lezer/common',
					'@lezer/highlight',
					'@lezer/lr',
					...builtins,
				],
			},
		},
	} as UserConfig;
});
