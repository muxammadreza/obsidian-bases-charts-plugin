import { UserConfig, defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import banner from 'vite-plugin-banner';
import path from 'path';
import builtins from 'builtin-modules';
import { getBuildBanner } from './automation/build/buildBanner';
import fs from 'fs';
import { fileURLToPath } from 'url';

const entryFile = 'packages/obsidian/src/main.ts';

// Load environment variables
const envFile = path.resolve(process.cwd(), '.env');
const env: Record<string, string> = {};
if (fs.existsSync(envFile)) {
	const envContent = fs.readFileSync(envFile, 'utf-8');
	envContent.split('\n').forEach(line => {
		const match = line.match(/^([^=]+)=(.*)$/);
		if (match) {
			env[match[1].trim()] = match[2].trim();
		}
	});
}

const realVaultDir = env['REAL_VAULT_DIR'];

// Custom plugin for hot-reload copying to vault directory
function vaultSyncPlugin() {
	return {
		name: 'vault-sync',
		apply: 'build',
		enforce: 'post',
		async generateBundle() {
			if (!realVaultDir) return;
			
			// This will be called after each build
			// The actual file copying will happen via the writeBundle hook
		},
		async writeBundle() {
			if (!realVaultDir) return;
			
			const distDir = path.resolve(process.cwd(), 'dist/dev');
			
			// Copy files to vault directory
			const filesToCopy = ['main.js', 'styles.css', 'manifest.json'];
			
			for (const file of filesToCopy) {
				const src = path.join(distDir, file);
				const dest = path.join(realVaultDir, file);
				
				if (fs.existsSync(src)) {
					fs.mkdirSync(path.dirname(dest), { recursive: true });
					fs.copyFileSync(src, dest);
					console.log(`✓ Synced ${file} to vault`);
				}
			}
		},
	};
}

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

	if (!prod) {
		plugins.push(vaultSyncPlugin());
	}

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
			watch: !prod ? false : undefined,
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
