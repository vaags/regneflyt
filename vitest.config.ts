import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import path from 'path'

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		fsModuleCache: true,
		isolate: true,
		alias: {
			'$app/navigation': path.resolve(
				import.meta.dirname,
				'./tests/unit/mocks/app-navigation.ts'
			),
			'$app/paths': path.resolve(
				import.meta.dirname,
				'./tests/unit/mocks/app-paths.ts'
			)
		},
		include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.svelte.ts'],
		setupFiles: ['tests/unit/component-setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			// Directory globs keep new framework-neutral modules under the
			// thresholds automatically. Components and routes are covered by
			// component and E2E tests instead.
			include: [
				'src/lib/domain/**/*.ts',
				'src/lib/helpers/**/*.ts',
				'src/lib/models/**/*.ts',
				'src/lib/stores.svelte.ts'
			],
			// Ratchet: keep global floors just below the measured baseline and
			// raise them as coverage improves.
			thresholds: {
				statements: 93,
				branches: 87,
				functions: 95,
				lines: 94,
				'src/lib/domain/**/*.ts': {
					statements: 97,
					branches: 94,
					functions: 100,
					lines: 97
				}
			}
		}
	}
})
