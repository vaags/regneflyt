import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import sveltePlugin from 'eslint-plugin-svelte'
import playwrightPlugin from 'eslint-plugin-playwright'
import eslintCommentsPlugin from '@eslint-community/eslint-plugin-eslint-comments'

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
	'no-debugger': 'error',
	'@typescript-eslint/ban-ts-comment': [
		'error',
		{
			'ts-expect-error': 'allow-with-description',
			'ts-ignore': false,
			'ts-nocheck': false,
			'ts-check': false
		}
	]
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
	'@typescript-eslint/explicit-function-return-type': [
		'error',
		{
			allowExpressions: true,
			allowTypedFunctionExpressions: true,
			allowHigherOrderFunctions: true
		}
	],
	'@typescript-eslint/explicit-module-boundary-types': 'error',
	'@typescript-eslint/strict-boolean-expressions': 'error',
	'@typescript-eslint/switch-exhaustiveness-check': 'error',
	'@typescript-eslint/no-unnecessary-condition': 'error',
	'@typescript-eslint/no-unnecessary-type-assertion': 'error',
	'@typescript-eslint/consistent-type-imports': 'error',
	'@typescript-eslint/no-redundant-type-constituents': 'error',
	'@typescript-eslint/no-confusing-void-expression': 'error',
	'@typescript-eslint/only-throw-error': 'error',
	'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
	'@typescript-eslint/no-non-null-assertion': 'error',
	'@typescript-eslint/consistent-return': 'error',
	'@typescript-eslint/return-await': 'error',
	'@typescript-eslint/strict-void-return': ['error', { allowReturnAny: true }],
	'@typescript-eslint/prefer-nullish-coalescing': 'error',
	'no-shadow': 'error',
	'@typescript-eslint/prefer-as-const': 'error',
	'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
	'@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
	'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
	'@typescript-eslint/no-inferrable-types': 'error',
	'@typescript-eslint/prefer-readonly': 'error',
	'@typescript-eslint/require-await': 'error',
	'@typescript-eslint/no-unsafe-enum-comparison': 'error',
	'@typescript-eslint/prefer-optional-chain': 'error',
	'@typescript-eslint/no-unnecessary-template-expression': 'error',
	'@typescript-eslint/no-misused-spread': 'error',
	'no-unused-expressions': 'error',
	'no-loop-func': 'error',
	'@typescript-eslint/unbound-method': 'error',
	'@typescript-eslint/no-use-before-define': [
		'error',
		{
			functions: false,
			classes: true,
			variables: true,
			enums: true,
			typedefs: true,
			ignoreTypeReferences: true
		}
	],
	'@typescript-eslint/no-array-delete': 'error',
	'@typescript-eslint/no-dynamic-delete': 'error',
	'@typescript-eslint/no-import-type-side-effects': 'error',
	'@typescript-eslint/consistent-type-exports': 'error',
	'@typescript-eslint/prefer-function-type': 'error',
	'@typescript-eslint/non-nullable-type-assertion-style': 'error',
	'@typescript-eslint/restrict-plus-operands': 'error',
	'@typescript-eslint/no-empty-interface': 'error',
	'@typescript-eslint/no-invalid-void-type': 'error',
	'@typescript-eslint/no-meaningless-void-operator': 'error',
	'@typescript-eslint/prefer-for-of': 'error',
	'@typescript-eslint/prefer-regexp-exec': 'error',
	'@typescript-eslint/no-unnecessary-parameter-property-assignment': 'error',
	'@typescript-eslint/no-useless-empty-export': 'error',
	'@typescript-eslint/no-require-imports': 'error',
	'@typescript-eslint/no-wrapper-object-types': 'error',
	eqeqeq: ['error', 'smart'],
	'no-implicit-coercion': 'error',
	'no-param-reassign': 'error',
	'@typescript-eslint/naming-convention': [
		'error',
		{
			selector: 'default',
			format: ['camelCase'],
			leadingUnderscore: 'allow',
			trailingUnderscore: 'allow'
		},
		{
			selector: 'variable',
			format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
			leadingUnderscore: 'allow'
		},
		{
			selector: 'objectLiteralProperty',
			format: null
		},
		{
			selector: 'typeLike',
			format: ['PascalCase']
		},
		{
			selector: 'enumMember',
			format: ['PascalCase', 'UPPER_CASE']
		},
		{
			selector: 'classProperty',
			modifiers: ['static', 'readonly'],
			format: ['UPPER_CASE']
		}
	]
}

export default [
	{
		plugins: { '@eslint-community/eslint-comments': eslintCommentsPlugin },
		rules: {
			'@eslint-community/eslint-comments/require-description': [
				'error',
				{ ignore: [] }
			]
		}
	},
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
	...sveltePlugin.configs['flat/base'],
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
			eqeqeq: ['error', 'smart'],
			'no-implicit-coercion': 'error',
			'no-param-reassign': 'error',
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
			'no-console': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',
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
		// Domain types should use named tuple elements for readability and tooling hints.
		files: ['src/lib/models/**/*.ts', 'src/lib/helpers/**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'ExportNamedDeclaration > TSTypeAliasDeclaration TSTupleType > :not(TSNamedTupleMember)',
					message:
						'Name tuple elements in exported types (for example: [left: number, right: number]).'
				},
				{
					selector:
						'ExportNamedDeclaration > TSInterfaceDeclaration TSTupleType > :not(TSNamedTupleMember)',
					message:
						'Name tuple elements in exported types (for example: [left: number, right: number]).'
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
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowFunctionsWithoutTypeParameters: true
				}
			],
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'@typescript-eslint/consistent-return': 'error',
			'@typescript-eslint/return-await': 'error',
			'@typescript-eslint/strict-void-return': [
				'error',
				{ allowReturnAny: true }
			],
			'@typescript-eslint/prefer-as-const': 'error',
			'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
			'@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-unsafe-enum-comparison': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/no-unnecessary-template-expression': 'error',
			'@typescript-eslint/no-misused-spread': 'error',
			'no-unused-expressions': 'error',
			'no-loop-func': 'error',
			'@typescript-eslint/restrict-plus-operands': 'error',
			'@typescript-eslint/naming-convention': 'off',
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'AssignmentExpression[left.type="MemberExpression"][left.object.type="MemberExpression"][left.object.property.name="adaptiveSkillByOperator"][right.type="ArrayExpression"]',
					message:
						'Avoid assigning raw arrays to adaptiveSkillByOperator in tests. Use a derived helper (for example uniformSkillMap(adaptiveTuning.minSkill/maxSkill)).'
				},
				{
					selector:
						'AssignmentExpression[left.type="MemberExpression"][left.object.type="MemberExpression"][left.object.property.name="adaptiveSkillByOperator"][left.property.type="Literal"][right.type="Literal"][right.value=100]',
					message:
						'Avoid hardcoded max-skill literal 100 for adaptiveSkillByOperator in tests. Derive from adaptiveTuning.maxSkill.'
				},
				{
					selector:
						'CallExpression[callee.object.name="fireEvent"][arguments.0.type="CallExpression"][arguments.0.callee.type="MemberExpression"][arguments.0.callee.property.name=/^(getByRole|findByRole|queryByRole|getByText|findByText|queryByText|getByLabelText|findByLabelText|queryByLabelText|getByPlaceholderText|findByPlaceholderText|getByAltText|getByTitle|findByTitle)$/]',
					message:
						'Use getByTestId/findByTestId/queryByTestId targets for fireEvent actions in tests.'
				},
				{
					selector:
						'CallExpression[callee.type="MemberExpression"][callee.property.name=/^(only|skip)$/][callee.object.type="Identifier"][callee.object.name=/^(it|test|describe|suite|context)$/]',
					message: 'Avoid focused or skipped tests in committed code.'
				},
				{
					selector:
						'CallExpression[callee.type="Identifier"][callee.name=/^(fit|fdescribe|xit|xdescribe)$/]',
					message: 'Avoid focused or skipped test aliases in committed code.'
				},
				{
					selector:
						'CallExpression[callee.type="MemberExpression"][callee.property.name=/^(only|skip)$/][callee.object.type="MemberExpression"][callee.object.object.type="Identifier"][callee.object.object.name="test"][callee.object.property.name="describe"]',
					message: 'Avoid focused or skipped tests in committed code.'
				}
			],
			'no-restricted-properties': [
				'error',
				{
					object: 'page',
					property: 'waitForTimeout',
					message:
						'Avoid fixed sleeps in tests. Use explicit waits with expect() or locator state checks.'
				},
				{
					object: 'page',
					property: '$',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'page',
					property: '$$',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'page',
					property: '$eval',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'page',
					property: '$$eval',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'frame',
					property: '$',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'frame',
					property: '$$',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'frame',
					property: '$eval',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				},
				{
					object: 'frame',
					property: '$$eval',
					message:
						'Avoid raw ElementHandle selectors. Prefer locator/getBy* APIs with stable test ids.'
				}
			]
		}
	},
	{
		// E2E specs: avoid brittle CSS selectors for interaction actions.
		files: ['tests/e2e/**/*.ts'],
		ignores: ['tests/e2e/e2eHelpers.ts', 'tests/e2e/fixtures.ts'],
		plugins: {
			playwright: playwrightPlugin
		},
		rules: {
			'playwright/no-focused-test': 'error',
			'playwright/no-skipped-test': 'error',
			'playwright/no-conditional-expect': 'error',
			'playwright/missing-playwright-await': 'error',
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'CallExpression[callee.property.name=/^(click|check|fill|press|type|hover|dblclick|tap|selectOption)$/][callee.object.type="CallExpression"][callee.object.callee.type="MemberExpression"][callee.object.callee.property.name=/^(getByRole|findByRole|queryByRole|getByText|findByText|queryByText|getByLabel|findByLabel|getByPlaceholder|getByAltText|getByTitle)$/]',
					message:
						'Use getByTestId selectors for Playwright interaction actions in e2e specs.'
				},
				{
					selector:
						'CallExpression[callee.property.name=/^(click|check|fill|press|type|hover|dblclick|tap|selectOption)$/][callee.object.type="CallExpression"][callee.object.callee.type="MemberExpression"][callee.object.callee.property.name=/^(first|last|nth|filter)$/][callee.object.callee.object.type="CallExpression"][callee.object.callee.object.callee.type="MemberExpression"][callee.object.callee.object.callee.property.name=/^(getByRole|findByRole|queryByRole|getByText|findByText|queryByText|getByLabel|findByLabel|getByPlaceholder|getByAltText|getByTitle)$/]',
					message:
						'Use getByTestId selectors for Playwright interaction actions, including chained selections.'
				},
				{
					selector:
						'CallExpression[callee.property.name=/^(click|check|fill|press|type|hover|dblclick|tap|selectOption)$/][callee.object.type="CallExpression"][callee.object.callee.type="MemberExpression"][callee.object.callee.property.name="locator"]',
					message:
						'Avoid CSS locator actions in e2e specs. Prefer getByTestId/getByRole/getByLabel-based selectors for interactions.'
				},
				{
					selector:
						'CallExpression[callee.property.name=/^(click|check|fill|press|type|hover|dblclick|tap|selectOption)$/][callee.object.type="CallExpression"][callee.object.callee.type="MemberExpression"][callee.object.callee.property.name=/^(first|last|nth|filter)$/][callee.object.callee.object.type="CallExpression"][callee.object.callee.object.callee.type="MemberExpression"][callee.object.callee.object.callee.property.name="locator"]',
					message:
						'Avoid CSS locator actions in e2e specs, including chained locator selections. Prefer getByTestId/getByRole/getByLabel-based selectors for interactions.'
				}
			]
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
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
			'svelte/experimental-require-slot-types': 'error',
			'svelte/experimental-require-strict-events': 'error',
			'svelte/require-store-callbacks-use-set-param': 'error',
			'svelte/no-add-event-listener': 'error',
			'svelte/no-dynamic-slot-name': 'error',
			'svelte/no-extra-reactive-curlies': 'error',
			'svelte/require-stores-init': 'error',
			'svelte/shorthand-directive': 'error'
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
		// Unit test files with .svelte.ts extension are pure TypeScript, not Svelte modules.
		// Use TypeScript parser instead of Svelte parser to avoid semantic mismatch.
		files: ['tests/**/*.svelte.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				sourceType: 'module',
				ecmaVersion
			}
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
