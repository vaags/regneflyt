import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'

const ecmaVersion = 'latest'

export default [
	{
		ignores: [
			'.svelte-kit/**',
			'.vercel/**',
			'build/**',
			'blob-report/**',
			'coverage/**',
			'dist/**',
			'node_modules/**',
			'playwright-report/**',
			'test-results/**',
			'.lighthouseci/**',
			'tailwind.config.cjs',
			'src/lib/paraglide/**'
		]
	},
	{
		files: ['**/*.{js,ts}'],
		languageOptions: {
			parser: tsParser,
			sourceType: 'module',
			ecmaVersion
		},
		plugins: {
			'@typescript-eslint': tsPlugin
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ varsIgnorePattern: '^_', argsIgnorePattern: '^_' }
			]
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				extraFileExtensions: ['.svelte'],
				sourceType: 'module',
				ecmaVersion
			}
		},
		plugins: {
			svelte: sveltePlugin,
			'@typescript-eslint': tsPlugin
		},
		rules: {
			...sveltePlugin.configs.recommended.rules,
			...tsPlugin.configs.recommended.rules,
			'svelte/valid-compile': 'error',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-unused-expressions': 'off'
		}
	},
	eslintConfigPrettier
]
