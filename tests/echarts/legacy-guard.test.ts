import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoot = join(repoRoot, 'packages', 'obsidian', 'src');

interface GuardPattern {
	label: string;
	pattern: RegExp;
}

const guardPatterns: GuardPattern[] = [
	{
		label: 'legacy svelte-echarts import',
		pattern: /from\s+['"]svelte-echarts['"]/u,
	},
	{
		label: 'legacy SvelteECharts symbol',
		pattern: /\bSvelteECharts\b/u,
	},
	{
		label: 'legacy SveltePlot symbol',
		pattern: /\bSveltePlot\b/u,
	},
	{
		label: 'legacy overrides identifier',
		pattern: /\bECHARTS_OVERRIDES\b/u,
	},
	{
		label: 'legacy overrides literal',
		pattern: /echarts-options-override/u,
	},
];

function collectSourceFiles(dir: string, accumulator: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (entry.startsWith('.')) {
			continue;
		}
		const filePath = join(dir, entry);
		const stats = statSync(filePath);
		if (stats.isDirectory()) {
			collectSourceFiles(filePath, accumulator);
			continue;
		}
		const extension = extname(filePath);
		if (!['.ts', '.svelte', '.js'].includes(extension)) {
			continue;
		}
		if (filePath.endsWith('.d.ts')) {
			continue;
		}
		accumulator.push(filePath);
	}
	return accumulator;
}

describe('legacy override and import guards', () => {
	test('source does not contain legacy chart wrappers', () => {
		const files = collectSourceFiles(sourceRoot);
		const violations: string[] = [];

		for (const file of files) {
			const content = readFileSync(file, 'utf8');
			for (const guard of guardPatterns) {
				guard.pattern.lastIndex = 0;
				if (guard.pattern.test(content)) {
					violations.push(`${guard.label} :: ${relative(repoRoot, file)}`);
				}
			}
		}

		expect(violations).toEqual([]);
	});
});
