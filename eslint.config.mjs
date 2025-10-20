// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import only_warn from 'eslint-plugin-only-warn';
import no_relative_import_paths from 'eslint-plugin-no-relative-import-paths';
import * as plugin_import from 'eslint-plugin-import';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
	{
		ignores: ['npm/', 'node_modules/', 'exampleVault/', 'automation/', 'dist/', '**/*.svelte', '**/*.d.ts'],
	},
	...eslintPluginSvelte.configs['flat/recommended'],
	...eslintPluginSvelte.configs['flat/prettier'],
	{
		files: ['packages/obsidian/**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
		},
		plugins: {
			// @ts-ignore
			'only-warn': only_warn,
			'no-relative-import-paths': no_relative_import_paths,
			import: plugin_import,
			obsidianmd: obsidianmd,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': ['warn'],

			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{ name: 'svelte-echarts', message: 'Legacy svelte-echarts wrappers are removed in favour of echarts6 runtime helpers (spec task 6).' },
						{ name: 'svelteplot', message: 'Legacy SveltePlot dependencies are not permitted (spec task 6).' },
					],
				},
			],
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],

			'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
			'import/order': [
				'error',
				{
					'newlines-between': 'never',
					alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
				},
			],

			'@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
			'@typescript-eslint/restrict-template-expressions': 'off',

			'no-relative-import-paths/no-relative-import-paths': ['warn', { allowSameFolder: false }],

			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/explicit-function-return-type': ['warn'],
			'@typescript-eslint/require-await': 'off',
			'no-restricted-syntax': [
				'error',
				{
					selector: "Identifier[name='ECHARTS_OVERRIDES']",
					message: 'Legacy JSON override identifiers are deprecated; use config stack state (spec task 6).',
				},
				{
					selector: "Literal[value='echarts-options-override']",
					message: 'Legacy JSON override literals are deprecated; use config stack state (spec task 6).',
				},
				{
					selector: "Identifier[name='SvelteECharts']",
					message: 'Legacy svelte-echarts component usage is disallowed; migrate to echarts6 runtime helpers (spec task 6).',
				},
				{
					selector: "Identifier[name='SveltePlot']",
					message: 'Legacy SveltePlot usage is disallowed; migrate to echarts6 runtime helpers (spec task 6).',
				},
			],

			...Object.keys(obsidianmd.rules).reduce((acc, ruleName) => {
				acc[`obsidianmd/${ruleName}`] = 'error';
				return acc;
			}, /** @type {Record<string, string>} */ ({})),
		},
	},
);
