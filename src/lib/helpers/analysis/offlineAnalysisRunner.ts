import { Operator, OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import { QuizState } from '#lib/domain/quiz/quizState.ts'
import {
	cloneOperatorTuple,
	type OperatorSkillMap
} from '#lib/domain/skill-progression/skillModel.ts'
import { adaptiveDifficultyId } from '#lib/domain/skill-progression/difficultyMode.ts'
import { withTuningScope } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import type { Quiz, OperatorSettingsByOperator } from '#lib/domain/quiz/quiz.ts'
import type { OperatorSettings } from '#lib/domain/quiz/operatorSettings.ts'
import type {
	OfflineAnalysisConfig,
	OfflineAnalysisStep
} from '#lib/models/OfflineAnalysisTypes.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { getPuzzle } from '#lib/domain/puzzle-generation/puzzleGenerator.ts'
import { applySkillUpdateDetailed } from '#lib/domain/skill-progression/skillProgression.ts'
import { resolveOperatorPuzzleSettings } from '#lib/domain/puzzle-generation/skillBasedPuzzleSettings.ts'
import { getPuzzleDifficulty } from '#lib/domain/puzzle-generation/puzzleDifficulty.ts'
import { getOperatorWeights } from '#lib/domain/puzzle-generation/operatorSelection.ts'
import {
	createRng,
	nextFloat,
	type Rng
} from '#lib/domain/puzzle-generation/random.ts'

function buildSimulationQuiz(
	skills: OperatorSkillMap,
	operator: OperatorExtended
): Quiz {
	const buildSettings = (op: Operator): OperatorSettings => {
		const { range, secondaryRange, possibleValues } =
			resolveOperatorPuzzleSettings(
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
		skillByOperator: skills,
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
		const skills = cloneOperatorTuple(config.startingSkills)
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
				allSkills: cloneOperatorTuple(skills),
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
