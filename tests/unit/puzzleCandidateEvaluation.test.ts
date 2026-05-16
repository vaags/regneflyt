import { describe, expect, it } from 'vitest'
import {
	evaluatePuzzleCandidate,
	getCandidateScore
} from '$lib/helpers/puzzleCandidateEvaluation'
import {
	OUT_OF_WINDOW_PENALTY,
	REPEAT_PENALTY,
	UNWANTED_CARRY_PENALTY
} from '$lib/helpers/difficultyScoring'
import { Operator } from '$lib/constants/Operator'
import type { PuzzlePartSet } from '$lib/models/Puzzle'

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
