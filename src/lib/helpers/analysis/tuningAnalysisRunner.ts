import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { OperatorExtended } from '#lib/domain/arithmetic/operator.ts'
import { PuzzleMode } from '#lib/domain/puzzle-generation/puzzleMode.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import {
	getPuzzleDifficulty,
	getDifficultyRatio,
	countCarriesOrBorrows
} from '#lib/domain/puzzle-generation/puzzleDifficulty.ts'
import { getPuzzle } from '#lib/domain/puzzle-generation/puzzleGenerator.ts'
import { getCooldownStepsRemaining } from '#lib/domain/puzzle-generation/puzzleCooldown.ts'
import { createRng, nextFloat } from '#lib/domain/puzzle-generation/random.ts'
import { resolveOperatorPuzzleSettings } from '#lib/domain/puzzle-generation/skillBasedPuzzleSettings.ts'
import { adaptiveDifficultyId } from '#lib/domain/skill-progression/difficultyMode.ts'
import {
	withTuningScope,
	type adaptiveTuning
} from '#lib/domain/skill-progression/adaptiveTuning.ts'
import {
	cloneOperatorTuple,
	type OperatorSkillMap
} from '#lib/domain/skill-progression/skillModel.ts'
import { applySkillUpdateDetailed } from '#lib/domain/skill-progression/skillProgression.ts'
import type { OperatorSettings } from '#lib/domain/quiz/operatorSettings.ts'
import type { OperatorSettingsByOperator, Quiz } from '#lib/domain/quiz/quiz.ts'
import { QuizState } from '#lib/domain/quiz/quizState.ts'

export type TuningAnalysisStep = {
	operator: Operator
	difficulty: number
	difficultyRatio: number
	isCorrect: boolean
	skillBefore: number
	skillAfter: number
	allSkills: OperatorSkillMap
	difficultyGateBlocked: boolean
	ceilingGainClamped: boolean
	floorPenaltyClamped: boolean
	puzzleMode: PuzzleMode
	unknownPartIndex: 0 | 1 | 2
	hasNegativeSubtractionResult: boolean
	hasCarryOrBorrow: boolean
	isUnknownDivisor: boolean
	isCooldownPuzzle: boolean
}

export type TuningSimulationConfig = {
	tuning: typeof adaptiveTuning
	startingSkills: OperatorSkillMap
	operator: OperatorExtended
	steps: number
	accuracy: number
	responseSeconds: number
	puzzleSeed: number
	answerSeed: number
}

function buildSimulationQuiz(
	skills: OperatorSkillMap,
	operator: OperatorExtended
): Quiz {
	const buildSettings = (activeOperator: Operator): OperatorSettings => {
		const { range, secondaryRange, possibleValues } =
			resolveOperatorPuzzleSettings(
				activeOperator,
				skills[activeOperator],
				adaptiveDifficultyId,
				[1, 100],
				[]
			)

		return {
			operator: activeOperator,
			range,
			possibleValues,
			...(secondaryRange === undefined ? {} : { secondaryRange })
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

export function deriveAnswerSeed(puzzleSeed: number): number {
	return (Math.trunc(puzzleSeed) ^ 0x6d2b79f5) | 0
}

export function runTuningSimulation(
	config: TuningSimulationConfig
): TuningAnalysisStep[] {
	return withTuningScope(config.tuning, () => {
		const { rng: puzzleRng } = createRng(config.puzzleSeed)
		const { rng: answerRng } = createRng(config.answerSeed)
		const skills = cloneOperatorTuple(config.startingSkills)
		const recentPuzzles: Puzzle[] = []
		const simulationSteps: TuningAnalysisStep[] = []
		let consecutiveCorrect = 0

		for (let index = 0; index < config.steps; index += 1) {
			const quiz = buildSimulationQuiz(skills, config.operator)
			const puzzle = getPuzzle(puzzleRng, quiz, recentPuzzles)
			const isCooldownPuzzle =
				getCooldownStepsRemaining(
					recentPuzzles,
					puzzle.operator,
					config.tuning.penalties.cooldownSteps
				) > 0
			const difficulty = getPuzzleDifficulty(puzzle.operator, puzzle.parts)
			const skillBefore = skills[puzzle.operator]
			const difficultyRatio = getDifficultyRatio(difficulty, skillBefore)
			const isCorrect = nextFloat(answerRng) < config.accuracy
			consecutiveCorrect = isCorrect ? consecutiveCorrect + 1 : 0

			const breakdown = applySkillUpdateDetailed(
				skills,
				puzzle.operator,
				puzzle.parts,
				isCorrect,
				config.responseSeconds,
				consecutiveCorrect
			)
			const realizedSkillChange = breakdown.newSkill - skillBefore

			simulationSteps.push({
				operator: puzzle.operator,
				difficulty,
				difficultyRatio,
				isCorrect,
				skillBefore,
				skillAfter: breakdown.newSkill,
				allSkills: cloneOperatorTuple(skills),
				difficultyGateBlocked:
					breakdown.isCorrect && breakdown.difficultyGateBlocked,
				ceilingGainClamped:
					breakdown.isCorrect && breakdown.finalDelta > realizedSkillChange,
				floorPenaltyClamped:
					!breakdown.isCorrect &&
					breakdown.cappedPenalty >
						Math.max(0, skillBefore - breakdown.newSkill),
				puzzleMode: puzzle.puzzleMode ?? PuzzleMode.Normal,
				unknownPartIndex: puzzle.unknownPartIndex,
				hasNegativeSubtractionResult:
					puzzle.operator === Operator.Subtraction &&
					puzzle.parts[2].generatedValue < 0,
				hasCarryOrBorrow:
					(puzzle.operator === Operator.Addition ||
						puzzle.operator === Operator.Subtraction) &&
					countCarriesOrBorrows(
						puzzle.parts[0].generatedValue,
						puzzle.parts[1].generatedValue,
						puzzle.operator === Operator.Subtraction
					) > 0,
				isUnknownDivisor:
					puzzle.operator === Operator.Division &&
					puzzle.unknownPartIndex === 1,
				isCooldownPuzzle
			})

			recentPuzzles.push({
				...puzzle,
				isCorrect,
				duration: config.responseSeconds
			})
			if (recentPuzzles.length > 5) recentPuzzles.shift()
		}

		return simulationSteps
	})
}
