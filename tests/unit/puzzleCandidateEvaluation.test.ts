import { describe, expect, it } from 'vitest'
import {
	evaluateDifficultyBounds,
	evaluatePuzzleCandidate,
	getCandidateScore,
	hasUnwantedCarryOrBorrow,
	OUT_OF_WINDOW_PENALTY,
	REPEAT_PENALTY,
	UNWANTED_CARRY_PENALTY
} from '#lib/domain/puzzle-generation/puzzleCandidateEvaluation.ts'
import { Operator } from '#lib/domain/arithmetic/operator.ts'
import type { PuzzlePartSet } from '#lib/domain/puzzle-generation/puzzle.ts'

describe('puzzleCandidateEvaluation', () => {
	describe('evaluatePuzzleCandidate', () => {
		const additionParts: PuzzlePartSet = [
			{ generatedValue: 5, userDefinedValue: undefined },
			{ generatedValue: 3, userDefinedValue: undefined },
			{ generatedValue: 8, userDefinedValue: undefined }
		]

		it('evaluates in-window, non-repeat, no-carry candidate', () => {
			const result = evaluatePuzzleCandidate(
				additionParts,
				[],
				Operator.Addition,
				10,
				25,
				true
			)

			expect(result.isRepeat).toBe(false)
			expect(result.hasUnwantedCarry).toBe(false)
			expect(result.tooEasy).toBe(false)
			expect(result.tooHard).toBe(false)
		})

		it('detects repeat puzzles', () => {
			const recentParts: PuzzlePartSet[] = [additionParts]

			const result = evaluatePuzzleCandidate(
				additionParts,
				recentParts,
				Operator.Addition,
				5,
				15
			)

			expect(result.isRepeat).toBe(true)
		})

		it('detects out-of-bounds puzzles', () => {
			const result = evaluatePuzzleCandidate(
				additionParts,
				[],
				Operator.Addition,
				30,
				100
			)

			expect(result.tooEasy || result.tooHard).toBe(true)
		})
	})

	describe('getCandidateScore', () => {
		it('scores in-window candidate as zero', () => {
			const evaluation = {
				difficulty: 10,
				isRepeat: false,
				hasUnwantedCarry: false,
				tooEasy: false,
				tooHard: false,
				difficultyShortfall: 0,
				difficultyOvershoot: 0
			}

			const score = getCandidateScore(evaluation, false)

			expect(score).toBe(0)
		})

		it('applies out-of-window penalty when prioritization is enabled', () => {
			const evaluation = {
				difficulty: 5,
				isRepeat: false,
				hasUnwantedCarry: false,
				tooEasy: true,
				tooHard: false,
				difficultyShortfall: 20,
				difficultyOvershoot: 0
			}

			const scoreWithoutPrioritization = getCandidateScore(evaluation, false)
			const scoreWithPrioritization = getCandidateScore(evaluation, true)

			// Without prioritization: only continuous penalty (difficulty shortfall)
			expect(scoreWithoutPrioritization).toBe(20)
			// With prioritization: out-of-window + continuous penalty
			expect(scoreWithPrioritization).toBeGreaterThan(
				scoreWithoutPrioritization
			)
			expect(scoreWithPrioritization).toBeGreaterThanOrEqual(
				OUT_OF_WINDOW_PENALTY + 20
			)
		})

		it('applies repeat penalty', () => {
			const evaluation = {
				difficulty: 10,
				isRepeat: true,
				hasUnwantedCarry: false,
				tooEasy: false,
				tooHard: false,
				difficultyShortfall: 0,
				difficultyOvershoot: 0
			}

			const score = getCandidateScore(evaluation, false)

			expect(score).toBe(REPEAT_PENALTY)
		})

		it('applies unwanted carry penalty', () => {
			const evaluation = {
				difficulty: 10,
				isRepeat: false,
				hasUnwantedCarry: true,
				tooEasy: false,
				tooHard: false,
				difficultyShortfall: 0,
				difficultyOvershoot: 0
			}

			const score = getCandidateScore(evaluation, false)

			expect(score).toBe(UNWANTED_CARRY_PENALTY)
		})

		it('accumulates multiple penalties', () => {
			const evaluation = {
				difficulty: 5,
				isRepeat: true,
				hasUnwantedCarry: true,
				tooEasy: true,
				tooHard: false,
				difficultyShortfall: 25,
				difficultyOvershoot: 0
			}

			const score = getCandidateScore(evaluation, false)

			const expectedScore = REPEAT_PENALTY + UNWANTED_CARRY_PENALTY + 25

			expect(score).toBe(expectedScore)
		})

		it('scores repeated candidates higher (worse) than unique candidates', () => {
			const uniqueEvaluation = {
				difficulty: 10,
				isRepeat: false,
				hasUnwantedCarry: false,
				tooEasy: false,
				tooHard: false,
				difficultyShortfall: 0,
				difficultyOvershoot: 0
			}

			const repeatEvaluation = {
				...uniqueEvaluation,
				isRepeat: true
			}

			const uniqueScore = getCandidateScore(uniqueEvaluation, false)
			const repeatScore = getCandidateScore(repeatEvaluation, false)

			expect(repeatScore).toBeGreaterThan(uniqueScore)
		})
	})
})

describe('puzzleCandidateEvaluation primitives', () => {
	describe('penalty constants', () => {
		it('defines penalty hierarchy in expected order', () => {
			// Out-of-window penalty should be highest
			expect(OUT_OF_WINDOW_PENALTY).toBeGreaterThan(REPEAT_PENALTY)
			// Repeat penalty should be higher than carry penalty
			expect(REPEAT_PENALTY).toBeGreaterThan(UNWANTED_CARRY_PENALTY)
		})
	})

	describe('evaluateDifficultyBounds', () => {
		it('detects puzzles within difficulty bounds', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 5, userDefinedValue: undefined },
				{ generatedValue: 3, userDefinedValue: undefined },
				{ generatedValue: 8, userDefinedValue: undefined }
			]

			const result = evaluateDifficultyBounds(Operator.Addition, parts, 10, 25)

			expect(result.tooEasy).toBe(false)
			expect(result.tooHard).toBe(false)
			expect(result.difficultyShortfall).toBe(0)
			expect(result.difficultyOvershoot).toBe(0)
		})

		it('detects puzzles too easy (below minimum difficulty)', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 1, userDefinedValue: undefined },
				{ generatedValue: 1, userDefinedValue: undefined },
				{ generatedValue: 2, userDefinedValue: undefined }
			]

			const result = evaluateDifficultyBounds(Operator.Addition, parts, 30, 100)

			expect(result.tooEasy).toBe(true)
			expect(result.difficultyShortfall).toBeGreaterThan(0)
		})

		it('detects puzzles too hard (above maximum difficulty)', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 99, userDefinedValue: undefined },
				{ generatedValue: 98, userDefinedValue: undefined },
				{ generatedValue: 197, userDefinedValue: undefined }
			]

			const result = evaluateDifficultyBounds(Operator.Addition, parts, 0, 20)

			expect(result.tooHard).toBe(true)
			expect(result.difficultyOvershoot).toBeGreaterThan(0)
		})
	})

	describe('hasUnwantedCarryOrBorrow', () => {
		it('returns false when preferNoCarry is false', () => {
			const parts: PuzzlePartSet = [
				{ generatedValue: 7, userDefinedValue: undefined },
				{ generatedValue: 5, userDefinedValue: undefined },
				{ generatedValue: 12, userDefinedValue: undefined }
			]

			const result = hasUnwantedCarryOrBorrow(parts, Operator.Addition, false)

			expect(result).toBe(false)
		})

		it('detects carries in addition when preferNoCarry is true', () => {
			// 17 + 15 = 32 (has carry in ones place)
			const parts: PuzzlePartSet = [
				{ generatedValue: 17, userDefinedValue: undefined },
				{ generatedValue: 15, userDefinedValue: undefined },
				{ generatedValue: 32, userDefinedValue: undefined }
			]

			const result = hasUnwantedCarryOrBorrow(parts, Operator.Addition, true)

			expect(result).toBe(true)
		})

		it('detects borrows in subtraction when preferNoCarry is true', () => {
			// 32 - 15 = 17 (has borrow in ones place: 2 < 5)
			const parts: PuzzlePartSet = [
				{ generatedValue: 32, userDefinedValue: undefined },
				{ generatedValue: 15, userDefinedValue: undefined },
				{ generatedValue: 17, userDefinedValue: undefined }
			]

			const result = hasUnwantedCarryOrBorrow(parts, Operator.Subtraction, true)

			expect(result).toBe(true)
		})
	})
})
