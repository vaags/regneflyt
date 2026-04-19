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

const storesRestrictedImportPatterns = [
	{
		regex: '(\\$lib/stores\\.svelte|(^|/)stores\\.svelte)$',
		message: "Import from '$lib/stores', not '$lib/stores.svelte' directly."
	}
]

const routeQuizRestrictedImportPaths = [
	{
		name: '$lib/helpers/quiz',
		message:
			'Import from a specific module under $lib/helpers/quiz/* in route files.'
	},
	{
		name: '$lib/helpers/quiz/index',
		message:
			'Import from a specific module under $lib/helpers/quiz/* in route files.'
	}
]

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
			],
			// Enforce barrel import: all consumers must import from $lib/stores, not the
			// implementation file directly. This keeps the public API surface stable.
			'no-restricted-imports': [
				'error',
				{
					patterns: storesRestrictedImportPatterns
				}
			]
		}
	},
	{
		// Global route strictness: route files must import concrete quiz helper modules
		// instead of the broad quiz barrel to avoid eager coupling.
		files: ['src/routes/**/*.ts', 'src/routes/**/*.svelte'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: routeQuizRestrictedImportPaths,
					patterns: storesRestrictedImportPatterns
				}
			]
		}
	},
	{
		// Ban raw $state/$derived rune calls in .ts files other than the store
		// primitives file. Use createStateRef/createDerivedRef from $lib/stores.
		files: ['src/**/*.ts'],
		ignores: ['src/lib/stores.svelte.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						':matches(Program > VariableDeclaration > VariableDeclarator > CallExpression[callee.name="$state"], Program > ExpressionStatement > CallExpression[callee.name="$state"])',
					message:
						'Use createStateRef() from $lib/stores instead of raw $state() in module-level .ts files.'
				},
				{
					selector:
						':matches(Program > VariableDeclaration > VariableDeclarator > CallExpression[callee.type="MemberExpression"][callee.object.name="$derived"][callee.property.name="by"], Program > ExpressionStatement > CallExpression[callee.type="MemberExpression"][callee.object.name="$derived"][callee.property.name="by"])',
					message:
						'Use createDerivedRef() from $lib/stores instead of raw $derived.by() in module-level .ts files.'
				},
				{
					selector:
						':matches(Program > VariableDeclaration > VariableDeclarator > CallExpression[callee.name="$derived"], Program > ExpressionStatement > CallExpression[callee.name="$derived"])',
					message:
						'Use createDerivedRef() from $lib/stores instead of raw $derived() in module-level .ts files.'
				}
			]
		}
	},
	{
		// Barrel file intentionally re-exports from stores.svelte.
		files: ['src/lib/stores.ts'],
		rules: {
			'no-restricted-imports': 'off'
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
			'no-restricted-imports': [
				'error',
				{
					patterns: storesRestrictedImportPatterns
				}
			],
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
