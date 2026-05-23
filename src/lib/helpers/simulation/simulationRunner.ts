import { Operator } from '$lib/constants/Operator'
import type { OperatorExtended } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import { QuizState } from '$lib/constants/QuizState'
import {
	adaptiveDifficultyId,
	withTuningScope,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import type { Quiz } from '$lib/models/Quiz'
import type {
	SimulationConfig,
	SimulationStep
} from '$lib/models/SimulationTypes'
import type { Puzzle } from '$lib/models/Puzzle'
import { getPuzzle } from '$lib/helpers/puzzleHelper'
import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
import { getPuzzleDifficulty } from '$lib/helpers/adaptiveDifficultyScoring'
import { createRng, nextFloat, type Rng } from '$lib/helpers/rng'

function buildSimulationQuiz(
	skills: AdaptiveSkillMap,
	operator: OperatorExtended
): Quiz {
	return {
		duration: 60,
		showPuzzleProgressBar: false,
		operatorSettings: [
			{ operator: Operator.Addition, range: [1, 100], possibleValues: [] },
			{ operator: Operator.Subtraction, range: [1, 100], possibleValues: [] },
			{
				operator: Operator.Multiplication,
				range: [0, 0],
				possibleValues: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
			},
			{
				operator: Operator.Division,
				range: [0, 0],
				possibleValues: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
			}
		],
		state: QuizState.Started,
		selectedOperator: operator,
		puzzleMode: PuzzleMode.Normal,
		difficulty: adaptiveDifficultyId,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: skills,
		seed: 0
	}
}

export function runSimulation(config: SimulationConfig): SimulationStep[] {
	return withTuningScope(config.tuning, () => {
		const { rng } = createRng(config.seed)
		const skills: AdaptiveSkillMap = [...config.startingSkills]
		const steps: SimulationStep[] = []
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

			applySkillUpdate(
				skills,
				puzzle.operator,
				puzzle.parts,
				isCorrect,
				durationSeconds,
				consecutiveCorrect
			)

			const skillAfter = skills[puzzle.operator]

			steps.push({
				puzzle,
				difficulty,
				isCorrect,
				durationSeconds,
				skillBefore,
				skillAfter,
				operator: puzzle.operator,
				allSkills: [...skills] as AdaptiveSkillMap
			})

			recentPuzzles.push(puzzle)
			if (recentPuzzles.length > 5) {
				recentPuzzles.shift()
			}
		}

		return steps
	})
}

function resolveCorrectness(config: SimulationConfig, rng: Rng): boolean {
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
