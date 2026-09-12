import type { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzlePartSet } from '#lib/domain/puzzle-generation/puzzle.ts'
import {
	getDifficultyRatio,
	getPuzzleDifficulty
} from '#lib/domain/puzzle-generation/puzzleDifficulty.ts'
import type { OperatorSkillMap } from './skillModel.ts'
import {
	getSkillUpdateBreakdown,
	type SkillUpdateBreakdown
} from './skillUpdate.ts'

export function applySkillUpdate(
	skillMap: OperatorSkillMap,
	operator: Operator,
	parts: PuzzlePartSet,
	isCorrect: boolean,
	durationSeconds: number,
	consecutiveCorrect = 0
): number {
	return applySkillUpdateDetailed(
		skillMap,
		operator,
		parts,
		isCorrect,
		durationSeconds,
		consecutiveCorrect
	).newSkill
}

export function applySkillUpdateDetailed(
	skillMap: OperatorSkillMap,
	operator: Operator,
	parts: PuzzlePartSet,
	isCorrect: boolean,
	durationSeconds: number,
	consecutiveCorrect = 0
): SkillUpdateBreakdown {
	const currentSkill = skillMap[operator]
	const difficulty = getPuzzleDifficulty(operator, parts)
	const ratio = getDifficultyRatio(difficulty, currentSkill)
	const breakdown = getSkillUpdateBreakdown(
		currentSkill,
		isCorrect,
		durationSeconds,
		ratio,
		consecutiveCorrect
	)
	skillMap[operator] = breakdown.newSkill

	return breakdown
}
