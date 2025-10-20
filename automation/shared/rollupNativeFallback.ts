import { chmodSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

const rollupBases: Record<string, string[]> = {
	darwin: ['darwin-arm64', 'darwin-x64'],
	linux: ['linux-arm64-gnu', 'linux-x64-gnu'],
};

function ensureFallback(base: string): void {
	const packageName = `@rollup/rollup-${base}`;
	try {
		require.resolve(packageName);
		return;
	} catch {
		// fallthrough to generate shim
	}

	const targetDir = join(projectRoot, 'node_modules', '@rollup', `rollup-${base}`);
	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	const pkgJsonPath = join(targetDir, 'package.json');
	if (!existsSync(pkgJsonPath)) {
		writeFileSync(
			pkgJsonPath,
			JSON.stringify(
				{
					name: packageName,
					version: require('rollup/package.json').version,
					main: 'index.js',
					type: 'commonjs',
				},
				null,
				2,
			),
		);
	}

	const indexPath = join(targetDir, 'index.js');
	if (!existsSync(indexPath)) {
		writeFileSync(indexPath, "module.exports = require('@rollup/wasm-node');\n");
	}
}

export function ensureRollupNativeFallback(): void {
	const bases = rollupBases[process.platform];
	if (!bases) {
		return;
	}
	for (const base of bases) {
		ensureFallback(base);
	}
}

export function configureEsbuildFallback(): void {
	if (process.env.ESBUILD_BINARY_PATH) {
		return;
	}
	const wasmBinary = join(projectRoot, 'node_modules', 'esbuild-wasm', 'bin', 'esbuild');
	if (existsSync(wasmBinary)) {
		process.env.ESBUILD_BINARY_PATH = wasmBinary;
		ensureEsbuildShims();
	}
}

function ensureEsbuildShims(): void {
	const bases = rollupBases[process.platform];
	if (!bases) {
		return;
	}
	for (const base of bases) {
		createEsbuildShim(base);
	}
}

function createEsbuildShim(base: string): void {
	const packageName = `@esbuild/${base}`;
	try {
		require.resolve(packageName);
		return;
	} catch {
		// create shim
	}

	const targetDir = join(projectRoot, 'node_modules', '@esbuild', base);
	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}
	const binDir = join(targetDir, 'bin');
	if (!existsSync(binDir)) {
		mkdirSync(binDir, { recursive: true });
	}

	const shimPackageJson = join(targetDir, 'package.json');
	if (!existsSync(shimPackageJson)) {
		const version = require('esbuild/package.json').version;
		writeFileSync(
			shimPackageJson,
			JSON.stringify(
				{
					name: packageName,
					version,
					main: 'bin/esbuild',
					bin: {
						esbuild: 'bin/esbuild',
					},
				},
				null,
				2,
			),
		);
	}

	const sourceBin = join(projectRoot, 'node_modules', 'esbuild-wasm', 'bin', 'esbuild');
	const targetBin = join(binDir, 'esbuild');
	if (!existsSync(targetBin)) {
		copyFileSync(sourceBin, targetBin);
		chmodSync(targetBin, 0o755);
	}
}
