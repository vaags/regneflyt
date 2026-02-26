import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['tests/unit/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['src/helpers/quizHelper.ts', 'src/helpers/scoreHelper.ts'],
			thresholds: {
				lines: 70,
				functions: 85,
				statements: 70,
				branches: 55
			}
		}
	}
})