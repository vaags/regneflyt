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
				'src/helpers/quizHelper.ts',
				'src/helpers/statsHelper.ts',
				'src/helpers/puzzleHelper.ts',
				'src/helpers/urlParamsHelper.ts',
				'src/helpers/adaptiveHelper.ts',
				'src/helpers/skillCodeHelper.ts',
				'src/helpers/quizStateMachine.ts'
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
