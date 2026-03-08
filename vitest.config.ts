import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib')
		}
	},
	test: {
		include: ['tests/unit/**/*.test.ts'],
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
