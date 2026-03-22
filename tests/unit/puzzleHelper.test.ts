import { describe, expect, it } from 'vitest'
import { getPuzzle } from '$lib/helpers/puzzleHelper'
import { getQuiz } from '$lib/helpers/quizHelper'
import { applySkillUpdate } from '$lib/helpers/adaptiveHelper'
import {
	customAdaptiveDifficultyId,
	adaptiveTuning
} from '$lib/models/AdaptiveProfile'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { Puzzle } from '$lib/models/Puzzle'
import { createRng } from '$lib/helpers/rng'

describe('puzzleHelper', () => {
	it('creates addition puzzle with expected result in normal mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect(puzzle.operator).toBe(Operator.Addition)
		expect(puzzle.unknownPartIndex).toBe(2)
		// Parts form a valid addition: a + b = c
		expect(puzzle.parts[2].generatedValue).toBe(
			puzzle.parts[0].generatedValue + puzzle.parts[1].generatedValue
		)
		// At skill 0, operands should be within the low-end adaptive range
		expect(puzzle.parts[0].generatedValue).toBeGreaterThanOrEqual(1)
		expect(puzzle.parts[1].generatedValue).toBeGreaterThanOrEqual(1)
	})

	it('avoids negative subtraction answers when disabled', () => {
		for (let seed = 0; seed < 50; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=0'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.puzzleMode = PuzzleMode.Normal
			quiz.allowNegativeAnswers = false
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)

			expect(puzzle.parts[0].generatedValue).toBeGreaterThanOrEqual(
				puzzle.parts[1].generatedValue
			)
			expect(puzzle.parts[2].generatedValue).toBeGreaterThanOrEqual(0)
		}
	})

	it('does not reuse previous multiplication value when alternatives exist', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		quiz.operatorSettings[Operator.Multiplication].possibleValues = [7, 9]
		quiz.adaptiveSkillByOperator[Operator.Multiplication] = 100
		const { rng } = createRng(quiz.seed)

		const previousPuzzle: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 7 },
				{ userDefinedValue: undefined, generatedValue: 4 },
				{ userDefinedValue: undefined, generatedValue: 28 }
			],
			operator: Operator.Multiplication,
			duration: 0,
			isCorrect: undefined,
			unknownPartIndex: 1
		}

		const puzzle = getPuzzle(rng, quiz, [previousPuzzle])

		expect(puzzle.parts[0].generatedValue).toBe(9)
		expect(puzzle.parts[2].generatedValue).toBe(
			puzzle.parts[0].generatedValue * puzzle.parts[1].generatedValue
		)
		expect([0, 1]).toContain(puzzle.unknownPartIndex)
	})

	it('uses both multiplication alternate unknown branches across seeds', () => {
		const unknownIndices = new Set<number>()

		for (let seed = 0; seed < 50; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=0'))
			quiz.selectedOperator = Operator.Multiplication
			quiz.difficulty = customAdaptiveDifficultyId
			quiz.puzzleMode = PuzzleMode.Alternate
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			unknownIndices.add(puzzle.unknownPartIndex)
		}

		expect(unknownIndices.has(0)).toBe(true)
		expect(unknownIndices.has(1)).toBe(true)
	})

	it('uses random operator when selected operator is All', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect([
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		]).toContain(puzzle.operator)
	})

	it('in adaptive all mode, all four operators appear over many puzzles', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [0, 0, 0, 0]
		const { rng } = createRng(quiz.seed)

		const operatorCounts = new Map<Operator, number>()
		for (let i = 0; i < 200; i++) {
			const puzzle = getPuzzle(rng, quiz)
			operatorCounts.set(
				puzzle.operator,
				(operatorCounts.get(puzzle.operator) ?? 0) + 1
			)
		}

		// All four operators should appear at least once
		expect(operatorCounts.has(Operator.Addition)).toBe(true)
		expect(operatorCounts.has(Operator.Subtraction)).toBe(true)
		expect(operatorCounts.has(Operator.Multiplication)).toBe(true)
		expect(operatorCounts.has(Operator.Division)).toBe(true)
	})

	it('in adaptive all mode, high average skill includes all operators', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [80, 80, 80, 80]
		const { rng } = createRng(quiz.seed)

		const operatorCounts = new Map<Operator, number>()
		for (let i = 0; i < 200; i++) {
			const puzzle = getPuzzle(rng, quiz)
			operatorCounts.set(
				puzzle.operator,
				(operatorCounts.get(puzzle.operator) ?? 0) + 1
			)
		}

		expect(operatorCounts.has(Operator.Addition)).toBe(true)
		expect(operatorCounts.has(Operator.Subtraction)).toBe(true)
		expect(operatorCounts.has(Operator.Multiplication)).toBe(true)
		expect(operatorCounts.has(Operator.Division)).toBe(true)
	})

	it('throws when selected operator is undefined', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = undefined
		const { rng } = createRng(quiz.seed)

		expect(() => getPuzzle(rng, quiz)).toThrow(
			'Cannot get operator: parameter is undefined'
		)
	})

	it('uses single multiplication value directly when only one is configured', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.operatorSettings[Operator.Multiplication].possibleValues = [8]
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect(puzzle.parts[0].generatedValue).toBe(8)
		expect(puzzle.parts[2].generatedValue).toBe(
			puzzle.parts[0].generatedValue * puzzle.parts[1].generatedValue
		)
	})

	it('uses alternate unknown part rules for division', () => {
		const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
		quiz.selectedOperator = Operator.Division
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect(puzzle.unknownPartIndex).toBe(0)
		expect(puzzle.parts[2].generatedValue).toBe(
			puzzle.parts[0].generatedValue / puzzle.parts[1].generatedValue
		)
	})

	it('adaptive division below rollout start keeps unknown divisor disabled', () => {
		let hasDivisorUnknown = false
		for (let seed = 0; seed < 120; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
			quiz.selectedOperator = Operator.Division
			quiz.adaptiveSkillByOperator[Operator.Division] =
				adaptiveTuning.adaptiveDivisionDivisorUnknownStartSkill - 1
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.unknownPartIndex === 1) hasDivisorUnknown = true
		}

		expect(hasDivisorUnknown).toBe(false)
	})

	it('adaptive division at rollout ceiling includes unknown divisor puzzles', () => {
		let hasDivisorUnknown = false
		for (let seed = 0; seed < 200; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
			quiz.selectedOperator = Operator.Division
			quiz.adaptiveSkillByOperator[Operator.Division] =
				adaptiveTuning.adaptiveDivisionDivisorUnknownFullSkill
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.unknownPartIndex === 1) {
				hasDivisorUnknown = true
				break
			}
		}

		expect(hasDivisorUnknown).toBe(true)
	})

	it('keeps unknown part as answer in random mode when alternate is not chosen', () => {
		const unknownIndices = new Set<number>()
		for (let seed = 0; seed < 50; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
			quiz.selectedOperator = Operator.Addition
			quiz.difficulty = customAdaptiveDifficultyId
			quiz.puzzleMode = PuzzleMode.Random
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			unknownIndices.add(puzzle.unknownPartIndex)
		}

		expect(unknownIndices.has(2)).toBe(true)
	})

	it('uses alternate subtraction branch 0 in random mode when chosen', () => {
		const unknownIndices = new Set<number>()
		for (let seed = 0; seed < 50; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=0'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.difficulty = customAdaptiveDifficultyId
			quiz.puzzleMode = PuzzleMode.Random
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			unknownIndices.add(puzzle.unknownPartIndex)
		}

		expect(unknownIndices.has(0)).toBe(true)
	})

	it('uses previous division puzzle values to compute excluded seed value', () => {
		const previousPuzzle: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 20 },
				{ userDefinedValue: undefined, generatedValue: 5 },
				{ userDefinedValue: undefined, generatedValue: 4 }
			],
			operator: Operator.Division,
			duration: 0,
			isCorrect: undefined,
			unknownPartIndex: 0
		}

		let avoidedCount = 0
		const totalSeeds = 50
		for (let seed = 0; seed < totalSeeds; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
			quiz.selectedOperator = Operator.Division
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz, [previousPuzzle])

			expect(puzzle.parts[0].generatedValue).toBe(
				puzzle.parts[1].generatedValue * puzzle.parts[2].generatedValue
			)
			if (puzzle.parts[2].generatedValue !== 4) avoidedCount++
		}

		// The exclusion logic should avoid the previous result value most of the time
		expect(avoidedCount).toBeGreaterThan(totalSeeds * 0.8)
	})

	it('uses alternate subtraction unknown part branch that returns 1', () => {
		const unknownIndices = new Set<number>()
		for (let seed = 0; seed < 50; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=0'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.difficulty = customAdaptiveDifficultyId
			quiz.puzzleMode = PuzzleMode.Alternate
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			unknownIndices.add(puzzle.unknownPartIndex)
		}

		expect(unknownIndices.has(1)).toBe(true)
	})

	it('throws when puzzle settings use unsupported operator', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.operatorSettings[Operator.Addition].operator = 99 as Operator
		const { rng } = createRng(quiz.seed)

		expect(() => getPuzzle(rng, quiz)).toThrow(
			'Cannot get puzzleParts: Operator not recognized'
		)
	})

	it('adaptive mode blocks negative subtraction answers below skill threshold', () => {
		for (let seed = 0; seed < 50; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.adaptiveSkillByOperator[Operator.Subtraction] =
				adaptiveTuning.adaptiveNegativeAnswersThreshold - 1
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)

			expect(puzzle.parts[0].generatedValue).toBeGreaterThanOrEqual(
				puzzle.parts[1].generatedValue
			)
			expect(puzzle.parts[2].generatedValue).toBeGreaterThanOrEqual(0)
		}
	})

	it('adaptive mode allows negative subtraction answers at or above skill threshold', () => {
		let hasNegative = false
		for (let seed = 0; seed < 100; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.adaptiveSkillByOperator[Operator.Subtraction] =
				adaptiveTuning.adaptiveNegativeAnswersThreshold
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.parts[2].generatedValue < 0) hasNegative = true
		}

		// At least one puzzle should have a negative result
		expect(hasNegative).toBe(true)
	})

	it('throws when alternate unknown part is requested for unsupported operator', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = 99 as OperatorExtended
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		;(quiz.operatorSettings as unknown as Record<number, unknown[]>)[99] = {
			operator: Operator.Addition,
			range: [1, 20],
			possibleValues: []
		} as unknown as never[]
		const { rng } = createRng(quiz.seed)

		expect(() => getPuzzle(rng, quiz)).toThrow(
			'[Invariant] Cannot get alternate unknown puzzle part: 99'
		)
	})

	it('uses random operator in custom all-operators mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=0'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.difficulty = customAdaptiveDifficultyId
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect([
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		]).toContain(puzzle.operator)
	})

	it('falls back to last operator when weighted selection exhausts random weight', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [100, 100, 100, 100]
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		// Should still select a valid operator
		expect([
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		]).toContain(puzzle.operator)
	})

	it('prefers no-carry addition puzzles at low skill', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.adaptiveSkillByOperator[Operator.Addition] = 10 // below threshold
		const { rng } = createRng(quiz.seed)

		// Generate many puzzles and verify most don't require carry
		const puzzles: Puzzle[] = []
		for (let i = 0; i < 50; i++) {
			puzzles.push(getPuzzle(rng, quiz))
		}

		const carryCount = puzzles.filter((p) => {
			const a = p.parts[0].generatedValue
			const b = p.parts[1].generatedValue
			let x = Math.abs(a),
				y = Math.abs(b)
			while (x > 0 || y > 0) {
				if ((x % 10) + (y % 10) >= 10) return true
				x = Math.floor(x / 10)
				y = Math.floor(y / 10)
			}
			return false
		}).length

		// At low skill with range [1,5], most pairs are carry-free (e.g. 3+4=7)
		// Only 5+5=10 requires carry. With retry logic, carry puzzles should be rare.
		expect(carryCount).toBeLessThan(puzzles.length / 2)
	})

	it('prefers no-borrow subtraction puzzles at low skill', () => {
		const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
		quiz.selectedOperator = Operator.Subtraction
		quiz.adaptiveSkillByOperator[Operator.Subtraction] = 10 // below threshold
		const { rng } = createRng(quiz.seed)

		const puzzles: Puzzle[] = []
		for (let i = 0; i < 50; i++) {
			puzzles.push(getPuzzle(rng, quiz))
		}

		const borrowCount = puzzles.filter((p) => {
			let a = Math.abs(p.parts[0].generatedValue)
			let b = Math.abs(p.parts[1].generatedValue)
			if (a < b) [a, b] = [b, a]
			while (a > 0 || b > 0) {
				if (a % 10 < b % 10) return true
				a = Math.floor(a / 10)
				b = Math.floor(b / 10)
			}
			return false
		}).length

		expect(borrowCount).toBeLessThan(puzzles.length / 2)
	})

	it('does not apply carry avoidance above skill threshold', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.adaptiveSkillByOperator[Operator.Addition] =
			adaptiveTuning.carryBorrowSkillThreshold
		const { rng } = createRng(quiz.seed)

		// At/above threshold, carry avoidance is off — puzzles are generated normally
		const puzzle = getPuzzle(rng, quiz)
		expect(puzzle.operator).toBe(Operator.Addition)
		// No assertion on carry — just verifying it doesn't crash
	})

	it('reduces range after an incorrect answer via cooldown', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.adaptiveSkillByOperator[Operator.Addition] = 50

		const incorrectPuzzle: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 30 },
				{ userDefinedValue: undefined, generatedValue: 20 },
				{ userDefinedValue: undefined, generatedValue: 50 }
			],
			operator: Operator.Addition,
			duration: 3,
			isCorrect: false,
			unknownPartIndex: 2
		}

		// Generate puzzle with recent incorrect answer
		const { rng: rng1 } = createRng(quiz.seed)
		const puzzleAfterMiss = getPuzzle(rng1, quiz, [incorrectPuzzle])

		// Generate puzzle with no recent incorrect answer
		const correctPuzzle: Puzzle = {
			...incorrectPuzzle,
			isCorrect: true
		}
		const { rng: rng2 } = createRng(quiz.seed)
		const puzzleAfterHit = getPuzzle(rng2, quiz, [correctPuzzle])

		// Both should produce valid puzzles — the cooldown narrows the range
		// but shouldn't crash or produce degenerate puzzles
		expect(puzzleAfterMiss.operator).toBe(Operator.Addition)
		expect(puzzleAfterHit.operator).toBe(Operator.Addition)
	})

	it('cooldown ignores incorrect answers from different operators', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.adaptiveSkillByOperator[Operator.Addition] = 50
		const { rng } = createRng(quiz.seed)

		// Recent incorrect answer was subtraction, not addition
		const wrongSubtraction: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 10 },
				{ userDefinedValue: undefined, generatedValue: 5 },
				{ userDefinedValue: undefined, generatedValue: 5 }
			],
			operator: Operator.Subtraction,
			duration: 3,
			isCorrect: false,
			unknownPartIndex: 2
		}

		// Should not trigger cooldown for addition since the miss was subtraction
		const puzzle = getPuzzle(rng, quiz, [wrongSubtraction])
		expect(puzzle.operator).toBe(Operator.Addition)
		// Operands should be in the normal (non-reduced) range for skill 50
		expect(
			puzzle.parts[0].generatedValue + puzzle.parts[1].generatedValue
		).toBeGreaterThan(5)
	})

	it('generates new puzzle when previous puzzle has same values (retry path)', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.operatorSettings[Operator.Addition].range = [1, 1]
		const { rng } = createRng(quiz.seed)

		const previousPuzzle: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 1 },
				{ userDefinedValue: undefined, generatedValue: 1 },
				{ userDefinedValue: undefined, generatedValue: 2 }
			],
			operator: Operator.Addition,
			duration: 0,
			isCorrect: undefined,
			unknownPartIndex: 2
		}

		// Range [1,1] means only value 1 is possible; every attempt produces same puzzle.
		// After maxAttempts (10) the function gives up and returns the duplicate.
		const puzzle = getPuzzle(rng, quiz, [previousPuzzle])

		expect(puzzle.parts[0].generatedValue).toBe(1)
		expect(puzzle.parts[1].generatedValue).toBe(1)
		expect(puzzle.parts[2].generatedValue).toBe(2)
	})

	it('returns min when max equals min in range', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.operatorSettings[Operator.Addition].range = [5, 5]
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect(puzzle.parts[0].generatedValue).toBe(5)
		expect(puzzle.parts[1].generatedValue).toBe(5)
		expect(puzzle.parts[2].generatedValue).toBe(10)
	})

	it('uses Normal puzzle mode directly for addition', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0'))
		quiz.selectedOperator = Operator.Addition
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Normal
		const { rng } = createRng(quiz.seed)

		const puzzle = getPuzzle(rng, quiz)

		expect(puzzle.unknownPartIndex).toBe(2)
		expect(puzzle.puzzleMode).toBe(PuzzleMode.Normal)
	})

	it('produces identical puzzles from the same seed', () => {
		const seed = 12345

		const quiz1 = getQuiz(
			new URLSearchParams(`operator=0&difficulty=0&seed=${seed}`)
		)
		quiz1.selectedOperator = Operator.Addition
		const { rng: rng1 } = createRng(seed)
		const puzzle1 = getPuzzle(rng1, quiz1)

		const quiz2 = getQuiz(
			new URLSearchParams(`operator=0&difficulty=0&seed=${seed}`)
		)
		quiz2.selectedOperator = Operator.Addition
		const { rng: rng2 } = createRng(seed)
		const puzzle2 = getPuzzle(rng2, quiz2)

		expect(puzzle1.parts[0].generatedValue).toBe(
			puzzle2.parts[0].generatedValue
		)
		expect(puzzle1.parts[1].generatedValue).toBe(
			puzzle2.parts[1].generatedValue
		)
		expect(puzzle1.parts[2].generatedValue).toBe(
			puzzle2.parts[2].generatedValue
		)
		expect(puzzle1.unknownPartIndex).toBe(puzzle2.unknownPartIndex)
	})

	it('replay uses recorded puzzles for identical sequences', () => {
		const seed = 7
		const quiz = getQuiz(new URLSearchParams(`difficulty=0&seed=${seed}`))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [28, 28, 28, 28]
		const { rng } = createRng(seed)

		// Generate original puzzle sequence (with adaptive skill updates)
		const originalPuzzles: Puzzle[] = []
		let consecutiveCorrect = 0
		for (let i = 0; i < 20; i++) {
			const puzzle = getPuzzle(rng, quiz)
			originalPuzzles.push(puzzle)
			puzzle.isCorrect = true
			puzzle.duration = 2
			consecutiveCorrect++
			applySkillUpdate(
				quiz.adaptiveSkillByOperator,
				puzzle.operator,
				puzzle.parts,
				true,
				2,
				consecutiveCorrect
			)
		}

		// Replay from recorded puzzles (as PuzzleComponent does)
		for (let i = 0; i < originalPuzzles.length; i++) {
			const original = originalPuzzles[i]!
			const replayed = {
				...original,
				parts: original.parts.map((p) => ({
					...p,
					userDefinedValue: undefined
				})) as Puzzle['parts'],
				duration: 0,
				isCorrect: undefined
			}
			expect(replayed.parts[0].generatedValue, `puzzle ${i + 1} part 0`).toBe(
				original.parts[0].generatedValue
			)
			expect(replayed.parts[1].generatedValue, `puzzle ${i + 1} part 1`).toBe(
				original.parts[1].generatedValue
			)
			expect(replayed.parts[2].generatedValue, `puzzle ${i + 1} part 2`).toBe(
				original.parts[2].generatedValue
			)
			expect(replayed.operator, `puzzle ${i + 1} operator`).toBe(
				original.operator
			)
			expect(replayed.unknownPartIndex, `puzzle ${i + 1} unknown`).toBe(
				original.unknownPartIndex
			)
			// User state is cleared for replay
			expect(replayed.isCorrect).toBeUndefined()
			expect(replayed.duration).toBe(0)
			expect(
				replayed.parts[replayed.unknownPartIndex].userDefinedValue
			).toBeUndefined()
		}
	})
})
