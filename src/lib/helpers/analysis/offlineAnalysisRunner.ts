import { Operator, OperatorExtended } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { QuizState } from '$lib/constants/QuizState'
import {
	adaptiveDifficultyId,
	withTuningScope,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import type { Quiz, OperatorSettingsByOperator } from '$lib/models/Quiz'
import type { OperatorSettings } from '$lib/models/OperatorSettings'
import type {
	OfflineAnalysisConfig,
	OfflineAnalysisStep
} from '$lib/models/OfflineAnalysisTypes'
import type { Puzzle } from '$lib/models/Puzzle'
import { getPuzzle } from '$lib/helpers/puzzleHelper'
import {
	applySkillUpdateDetailed,
	getAdaptiveSettingsForOperator
} from '$lib/helpers/adaptiveHelper'
import { getPuzzleDifficulty } from '$lib/helpers/adaptiveDifficultyScoring'
import { getOperatorWeights } from '$lib/helpers/operatorResolution'
import { createRng, nextFloat, type Rng } from '$lib/helpers/rng'

function buildSimulationQuiz(
	skills: AdaptiveSkillMap,
	operator: OperatorExtended
): Quiz {
	const buildSettings = (op: Operator): OperatorSettings => {
		const { range, secondaryRange, possibleValues } =
			getAdaptiveSettingsForOperator(
				op,
				skills[op],
				adaptiveDifficultyId,
				[1, 100],
				[]
			)
		return {
			operator: op,
			range,
			possibleValues,
			...(secondaryRange && { secondaryRange })
		}
	}

	const operatorSettings = [
		buildSettings(Operator.Addition),
		buildSettings(Operator.Subtraction),
		buildSettings(Operator.Multiplication),
		buildSettings(Operator.Division)
	] satisfies OperatorSettingsByOperator

	return {
		duration: 60,
		showPuzzleProgressBar: false,
		operatorSettings,
		state: QuizState.Started,
		selectedOperator: operator,
		puzzleMode: PuzzleMode.Normal,
		difficulty: adaptiveDifficultyId,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: skills,
		seed: 0
	}
}

function resolveCorrectness(config: OfflineAnalysisConfig, rng: Rng): boolean {
	switch (config.correctnessMode) {
		case 'correct':
			return true
		case 'incorrect':
			return false
		case 'mixed':
			return nextFloat(rng) < config.mixedAccuracy
		default:
			return true
	}
}

export function runOfflineSimulation(
	config: OfflineAnalysisConfig
): OfflineAnalysisStep[] {
	return withTuningScope(config.tuning, () => {
		const { rng } = createRng(config.seed)
		const skills: AdaptiveSkillMap = [...config.startingSkills]
		const steps: OfflineAnalysisStep[] = []
		const recentPuzzles: Puzzle[] = []
		let consecutiveCorrect = 0

		for (let i = 0; i < config.steps; i++) {
			const quiz = buildSimulationQuiz(skills, config.operator)
			const puzzle = getPuzzle(rng, quiz, recentPuzzles)

			const difficulty = getPuzzleDifficulty(puzzle.operator, puzzle.parts)
			const skillBefore = skills[puzzle.operator]

			const isCorrect = resolveCorrectness(config, rng)
			const durationSeconds = config.responseSpeed

			if (isCorrect) {
				consecutiveCorrect++
			} else {
				consecutiveCorrect = 0
			}

			const breakdown = applySkillUpdateDetailed(
				skills,
				puzzle.operator,
				puzzle.parts,
				isCorrect,
				durationSeconds,
				consecutiveCorrect
			)

			const isAll = config.operator === OperatorExtended.All

			steps.push({
				puzzle,
				difficulty,
				isCorrect,
				durationSeconds,
				skillBefore,
				skillAfter: breakdown.newSkill,
				operator: puzzle.operator,
				allSkills: [...skills] as AdaptiveSkillMap,
				breakdown,
				consecutiveCorrect,
				...(isAll && {
					operatorWeights: getOperatorWeights(skills)
				})
			})

			recentPuzzles.push(puzzle)
			if (recentPuzzles.length > 5) {
				recentPuzzles.shift()
			}
		}

		return steps
	})
}
