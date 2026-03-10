import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
	plugins: [svelte({ hot: false, compilerOptions: { hmr: false } })],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib')
		},
		conditions: ['browser']
	},
	test: {
		include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.svelte.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: [
				'src/helpers/quizHelper.ts',
				'src/helpers/statsHelper.ts',
				'src/helpers/puzzleHelper.ts',
				'src/helpers/urlParamsHelper.ts'
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
