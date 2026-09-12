import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import { hasRegneflytStar } from '#lib/domain/quiz/quizScoring.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
import { applySkillUpdate } from '#lib/domain/skill-progression/skillProgression.ts'

export type CompletePuzzleAttemptInput = {
	puzzle: Puzzle
	skillByOperator: OperatorSkillMap
	durationSeconds: number
	consecutiveCorrect: number
}

export type CompletedPuzzleAttempt = {
	puzzle: Puzzle
	consecutiveCorrect: number
	awardedStar: boolean
}

export function completePuzzleAttempt({
	puzzle,
	skillByOperator,
	durationSeconds,
	consecutiveCorrect
}: CompletePuzzleAttemptInput): CompletedPuzzleAttempt {
	const submittedValue = puzzle.parts[puzzle.unknownPartIndex].userDefinedValue
	const generatedValue = puzzle.parts[puzzle.unknownPartIndex].generatedValue
	const isCorrect =
		submittedValue !== undefined &&
		!Object.is(submittedValue, -0) &&
		submittedValue === generatedValue
	const nextConsecutiveCorrect = isCorrect ? consecutiveCorrect + 1 : 0
	const completedPuzzle: Puzzle = {
		...puzzle,
		isCorrect,
		duration: durationSeconds
	}

	applySkillUpdate(
		skillByOperator,
		completedPuzzle.operator,
		completedPuzzle.parts,
		isCorrect,
		durationSeconds,
		nextConsecutiveCorrect
	)

	return {
		puzzle: completedPuzzle,
		consecutiveCorrect: nextConsecutiveCorrect,
		awardedStar: hasRegneflytStar(completedPuzzle)
	}
}
