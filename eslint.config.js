import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'

const ecmaVersion = 'latest'

const typeScriptPluginConfig = {
	'@typescript-eslint': tseslint.plugin
}

const typeAwareLanguageOptions = {
	parser: tseslint.parser,
	parserOptions: {
		projectService: true,
		tsconfigRootDir: import.meta.dirname
	},
	sourceType: 'module',
	ecmaVersion
}

const svelteRecommendedRules = Object.assign(
	{},
	...sveltePlugin.configs['flat/recommended'].map(
		(config) => config.rules ?? {}
	)
)

// Shared baseline for JS/TS files: hygiene and common quality checks.
const baseTypeScriptRules = {
	...tseslint.plugin.configs.recommended.rules,
	'@typescript-eslint/no-unused-vars': [
		'error',
		{ varsIgnorePattern: '^_', argsIgnorePattern: '^_' }
	],
	'prefer-const': 'error',
	'no-console': ['warn', { allow: ['warn', 'error'] }],
	'no-debugger': 'error'
}

// Strict type-safety layer used by production TS and tests.
const strictTypeScriptRules = {
	...baseTypeScriptRules,
	'@typescript-eslint/no-explicit-any': 'error',
	'@typescript-eslint/no-unsafe-assignment': 'error',
	'@typescript-eslint/no-unsafe-member-access': 'error',
	'@typescript-eslint/no-unsafe-call': 'error',
	'@typescript-eslint/no-unsafe-return': 'error',
	'@typescript-eslint/no-unsafe-argument': 'error',
	'@typescript-eslint/await-thenable': 'error',
	'@typescript-eslint/strict-boolean-expressions': 'error',
	'@typescript-eslint/switch-exhaustiveness-check': 'error',
	'@typescript-eslint/no-unnecessary-condition': 'error',
	'@typescript-eslint/no-unnecessary-type-assertion': 'error',
	'@typescript-eslint/consistent-type-imports': 'error',
	'@typescript-eslint/no-redundant-type-constituents': 'error',
	'@typescript-eslint/no-confusing-void-expression': 'error',
	'@typescript-eslint/only-throw-error': 'error',
	'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
	'@typescript-eslint/no-non-null-assertion': 'error'
}

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
		files: ['**/*.js'],
		languageOptions: {
			parser: tseslint.parser,
			sourceType: 'module',
			ecmaVersion
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin
		},
		rules: {
			...tseslint.plugin.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ varsIgnorePattern: '^_', argsIgnorePattern: '^_' }
			],
			'prefer-const': 'error',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error'
		}
	},
	{
		// Production TypeScript: strict rules at error level.
		files: ['src/**/*.ts'],
		languageOptions: typeAwareLanguageOptions,
		plugins: typeScriptPluginConfig,
		rules: {
			...strictTypeScriptRules,
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-unsafe-type-assertion': 'error',
			'@typescript-eslint/no-base-to-string': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
					allowBoolean: true
				}
			]
		}
	},
	{
		// Test TypeScript: same strict rules, but import() type style is warn.
		files: ['tests/**/*.ts'],
		languageOptions: typeAwareLanguageOptions,
		plugins: typeScriptPluginConfig,
		rules: {
			...strictTypeScriptRules,
			'@typescript-eslint/consistent-type-imports': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'off'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
				sourceType: 'module',
				ecmaVersion
			}
		},
		plugins: {
			svelte: sveltePlugin,
			'@typescript-eslint': tseslint.plugin
		},
		rules: {
			...svelteRecommendedRules,
			...tseslint.plugin.configs.recommended.rules,
			'svelte/valid-compile': 'error',
			'svelte/no-navigation-without-resolve': ['error', { ignoreGoto: true }],
			'svelte/no-useless-mustaches': 'error',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-unsafe-type-assertion': 'error',
			'@typescript-eslint/no-base-to-string': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
					allowBoolean: true
				}
			],
			'svelte/no-at-debug-tags': 'error',
			'svelte/no-at-html-tags': 'error',
			'svelte/no-immutable-reactive-statements': 'error',
			'svelte/prefer-class-directive': 'error',
			'svelte/no-unused-svelte-ignore': 'error',
			'svelte/no-inspect': 'error',
			'svelte/prefer-svelte-reactivity': 'error',
			'svelte/no-reactive-literals': 'error',
			'svelte/no-reactive-reassign': 'error',
			'svelte/no-reactive-functions': 'error',
			'svelte/no-unnecessary-state-wrap': 'error',
			'svelte/prefer-writable-derived': 'error',
			'svelte/no-store-async': 'error',
			'svelte/no-ignored-unsubscribe': 'error',
			'svelte/require-each-key': 'error',
			'svelte/no-top-level-browser-globals': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'svelte/button-has-type': 'error',
			'svelte/no-target-blank': 'error',
			'svelte/prefer-const': 'error',
			'svelte/derived-has-same-inputs-outputs': 'error',
			'svelte/no-inline-styles': 'error',
			'svelte/experimental-require-slot-types': 'warn',
			'svelte/experimental-require-strict-events': 'warn',
			'svelte/require-store-callbacks-use-set-param': 'warn',
			'svelte/no-add-event-listener': 'error',
			'svelte/no-dynamic-slot-name': 'error',
			'svelte/no-extra-reactive-curlies': 'error',
			'svelte/require-stores-init': 'error',
			'svelte/shorthand-directive': 'warn'
		}
	},
	{
		// Test Svelte harnesses: allow non-null assertions (idiomatic bind:this pattern).
		files: ['tests/**/*.svelte'],
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-unsafe-type-assertion': 'off'
		}
	},
	{
		// Progress bar components use data-driven inline width styles that cannot
		// be expressed as CSS classes. The rule is relaxed only for these files.
		files: [
			'src/lib/components/widgets/SkillBarComponent.svelte',
			'src/lib/components/widgets/TimeoutComponent.svelte'
		],
		rules: {
			'svelte/no-inline-styles': 'off'
		}
	},
	eslintConfigPrettier
]
