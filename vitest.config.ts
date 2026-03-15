import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib'),
			'$app/navigation': path.resolve(
				__dirname,
				'./tests/unit/mocks/app-navigation.ts'
			)
		},
		conditions: ['browser']
	},
	test: {
		include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.svelte.ts'],
		setupFiles: ['tests/unit/component-setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: [
				'src/lib/helpers/quizHelper.ts',
				'src/lib/helpers/statsHelper.ts',
				'src/lib/helpers/puzzleHelper.ts',
				'src/lib/helpers/urlParamsHelper.ts',
				'src/lib/helpers/adaptiveHelper.ts',
				'src/lib/helpers/quizStateMachine.ts'
			],
			thresholds: {
				lines: 70,
				functions: 85,
				statements: 80,
				branches: 80
			}
		}
	}
})
