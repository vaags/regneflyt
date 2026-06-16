import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import path from 'path'

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		alias: {
			'$app/navigation': path.resolve(
				__dirname,
				'./tests/unit/mocks/app-navigation.ts'
			),
			'$app/paths': path.resolve(__dirname, './tests/unit/mocks/app-paths.ts')
		},
		include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.svelte.ts'],
		setupFiles: ['tests/unit/component-setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: [
				'src/lib/helpers/quiz/quizHelper.ts',
				'src/lib/helpers/quiz/quizStateHelper.ts',
				'src/lib/helpers/statsHelper.ts',
				'src/lib/helpers/puzzleHelper.ts',
				'src/lib/helpers/urlParamsHelper.ts',
				'src/lib/helpers/adaptiveHelper.ts',
				'src/lib/helpers/adaptiveSkillUpdate.ts',
				'src/lib/helpers/adaptiveDifficultyScoring.ts',
				'src/lib/helpers/operatorResolution.ts',
				'src/lib/helpers/errorPatternHelper.ts',
				'src/lib/helpers/feedbackHelper.ts',
				'src/lib/stores.ts'
			],
			thresholds: {
				lines: 85,
				functions: 90,
				statements: 90,
				branches: 85
			}
		}
	}
})
