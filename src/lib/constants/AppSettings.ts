import { isDev, isProd } from '#lib/env.ts'
import { puzzleGenerationSettings } from '#lib/domain/puzzle-generation/puzzleGenerationSettings.ts'
import { regneflytThresholdSeconds } from '#lib/domain/quiz/quizScoring.ts'

const prefersReducedMotion =
	typeof window !== 'undefined' &&
	typeof window.matchMedia === 'function' &&
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

type DurationTransitionConfig = {
	readonly duration: number
}

type AppSettingsShape = {
	readonly isProduction: boolean
	readonly separatorPageDuration: number
	readonly regneflytThresholdSeconds: number
	readonly minTable: number
	readonly maxTable: number
	readonly additionMinRange: number
	readonly additionMaxRange: number
	readonly subtractionMinRange: number
	readonly subtractionMaxRange: number
	readonly maxPuzzleAnswerMagnitude: number
	readonly transitionDuration: DurationTransitionConfig
	readonly pageTransitionDuration: DurationTransitionConfig
	readonly correctionWrongDuration: number
}

const appSettings: AppSettingsShape = {
	isProduction: isProd,
	separatorPageDuration: prefersReducedMotion ? 0 : isDev ? 1 : 3,
	...puzzleGenerationSettings,
	regneflytThresholdSeconds,
	transitionDuration: {
		duration: prefersReducedMotion ? 0 : 200
	},
	pageTransitionDuration: {
		duration: prefersReducedMotion ? 0 : 200
	},
	correctionWrongDuration: prefersReducedMotion ? 0 : 1000
}

export const AppSettings: Readonly<AppSettingsShape> = Object.freeze({
	...appSettings,
	transitionDuration: Object.freeze(appSettings.transitionDuration),
	pageTransitionDuration: Object.freeze(appSettings.pageTransitionDuration)
})
