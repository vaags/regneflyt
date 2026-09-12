import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { validateAdaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuningValidation.ts'
import {
	validateDifficultyScoreRegistries,
	validatePuzzleGenerationSettings
} from '#lib/domain/puzzle-generation/puzzleGenerationSettings.ts'

if (import.meta.env.DEV) {
	validateAdaptiveTuning(adaptiveTuning)
	validatePuzzleGenerationSettings()
	validateDifficultyScoreRegistries()
}
