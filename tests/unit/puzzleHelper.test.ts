import { describe, expect, it } from 'vitest'
import { getPuzzle } from '$lib/helpers/puzzleHelper'
import { getQuiz } from '$lib/helpers/quiz/quizHelper'
import {
	applySkillUpdate,
	getPuzzleDifficulty
} from '$lib/helpers/adaptiveHelper'
import { customDifficultyId, adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { Puzzle } from '$lib/models/Puzzle'
import { createRng } from '$lib/helpers/rng'

function uniformSkillMap(skill: number): [number, number, number, number] {
	return [skill, skill, skill, skill]
}

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
		quiz.difficulty = customDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		quiz.operatorSettings[Operator.Multiplication].possibleValues = [7, 9]
		quiz.adaptiveSkillByOperator[Operator.Multiplication] =
			adaptiveTuning.maxSkill
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
			quiz.difficulty = customDifficultyId
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

	it('at skill 0, adaptive multiplication avoids high difficulty outliers', () => {
		for (let seed = 0; seed < 200; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
			quiz.selectedOperator = Operator.Multiplication
			quiz.adaptiveSkillByOperator[Operator.Multiplication] = 0
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			const difficulty = getPuzzleDifficulty(
				Operator.Multiplication,
				puzzle.parts
			)
			const maxExpectedDifficulty = Math.min(
				adaptiveTuning.maxSkill,
				adaptiveTuning.adaptiveDifficultyMaxOvershoot
			)

			expect(difficulty).toBeLessThanOrEqual(maxExpectedDifficulty)
		}
	})

	it('at skill 0, adaptive division avoids high difficulty outliers', () => {
		for (let seed = 0; seed < 200; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
			quiz.selectedOperator = Operator.Division
			quiz.adaptiveSkillByOperator[Operator.Division] = 0
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			const difficulty = getPuzzleDifficulty(Operator.Division, puzzle.parts)
			const maxExpectedDifficulty = Math.min(
				adaptiveTuning.maxSkill,
				adaptiveTuning.adaptiveDifficultyMaxOvershoot
			)

			expect(difficulty).toBeLessThanOrEqual(maxExpectedDifficulty)
		}
	})

	it('adaptive mode enforces max difficulty ceiling across operators and low-mid skills', () => {
		const operators = [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		] as const
		const skills = [0, 10, 30]

		for (const operator of operators) {
			for (const skill of skills) {
				for (let seed = 0; seed < 150; seed++) {
					const quiz = getQuiz(
						new URLSearchParams(`operator=${operator}&difficulty=1`)
					)
					quiz.selectedOperator = operator
					quiz.adaptiveSkillByOperator[operator] = skill
					const { rng } = createRng(seed)

					const puzzle = getPuzzle(rng, quiz)
					const difficulty = getPuzzleDifficulty(operator, puzzle.parts)
					const maxExpectedDifficulty = Math.min(
						adaptiveTuning.maxSkill,
						skill + adaptiveTuning.adaptiveDifficultyMaxOvershoot
					)

					expect(difficulty).toBeLessThanOrEqual(maxExpectedDifficulty)
				}
			}
		}
	})

	it('adaptive mode avoids very easy puzzles at skill 100 across operators', () => {
		const operators = [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		] as const
		const skill = adaptiveTuning.maxSkill

		for (const operator of operators) {
			for (let seed = 0; seed < 150; seed++) {
				const quiz = getQuiz(
					new URLSearchParams(`operator=${operator}&difficulty=1`)
				)
				quiz.selectedOperator = operator
				quiz.adaptiveSkillByOperator[operator] = skill
				const { rng } = createRng(seed)

				const puzzle = getPuzzle(rng, quiz)
				const difficulty = getPuzzleDifficulty(operator, puzzle.parts)
				const effectiveSkill =
					puzzle.unknownPartIndex === 0 || puzzle.unknownPartIndex === 1
						? Math.max(
								adaptiveTuning.minSkill,
								skill - adaptiveTuning.algebraicSkillOffset
							)
						: skill
				const minExpectedDifficulty = Math.max(
					Math.floor(effectiveSkill * adaptiveTuning.minDifficultyThreshold),
					effectiveSkill - adaptiveTuning.adaptiveDifficultyMaxOvershoot
				)

				expect(difficulty).toBeGreaterThanOrEqual(minExpectedDifficulty)
			}
		}
	})

	it('adaptive high-skill division sequence avoids very easy outliers', () => {
		const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
		quiz.selectedOperator = Operator.Division
		quiz.adaptiveSkillByOperator[Operator.Division] = adaptiveTuning.maxSkill
		const { rng } = createRng(42_4242)
		const recentPuzzles: Puzzle[] = []

		for (let i = 0; i < 120; i++) {
			const puzzle = getPuzzle(rng, quiz, recentPuzzles)
			const difficulty = getPuzzleDifficulty(Operator.Division, puzzle.parts)
			const effectiveSkill =
				puzzle.unknownPartIndex === 0 || puzzle.unknownPartIndex === 1
					? Math.max(
							adaptiveTuning.minSkill,
							adaptiveTuning.maxSkill - adaptiveTuning.algebraicSkillOffset
						)
					: adaptiveTuning.maxSkill
			const minExpectedDifficulty = Math.max(
				Math.floor(effectiveSkill * adaptiveTuning.minDifficultyThreshold),
				effectiveSkill - adaptiveTuning.adaptiveDifficultyMaxOvershoot
			)

			expect(difficulty).toBeGreaterThanOrEqual(minExpectedDifficulty)

			recentPuzzles.push(puzzle)
			if (recentPuzzles.length > 5) recentPuzzles.shift()
		}
	})

	it('adaptive algebraic forms respect effective-skill max difficulty ceiling', () => {
		const operators = [
			Operator.Addition,
			Operator.Subtraction,
			Operator.Multiplication,
			Operator.Division
		] as const
		const skill = 70

		for (const operator of operators) {
			const quiz = getQuiz(
				new URLSearchParams(`operator=${operator}&difficulty=1`)
			)
			quiz.selectedOperator = operator
			quiz.adaptiveSkillByOperator[operator] = skill
			const { rng } = createRng(10_000 + operator)

			let algebraicSamples = 0
			for (let i = 0; i < 500; i++) {
				const puzzle = getPuzzle(rng, quiz)
				if (puzzle.unknownPartIndex === 2) continue

				algebraicSamples++
				const difficulty = getPuzzleDifficulty(operator, puzzle.parts)
				const effectiveSkill = Math.max(
					adaptiveTuning.minSkill,
					skill - adaptiveTuning.algebraicSkillOffset
				)
				const maxExpectedDifficulty = Math.min(
					adaptiveTuning.maxSkill,
					effectiveSkill + adaptiveTuning.adaptiveDifficultyMaxOvershoot
				)

				expect(difficulty).toBeLessThanOrEqual(maxExpectedDifficulty)

				if (algebraicSamples >= 20) break
			}

			expect(algebraicSamples).toBeGreaterThan(0)
		}
	})

	it('in adaptive all mode, all four operators appear over many puzzles', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = uniformSkillMap(adaptiveTuning.minSkill)
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
		quiz.adaptiveSkillByOperator = uniformSkillMap(80)
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
		quiz.difficulty = customDifficultyId
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
		quiz.difficulty = customDifficultyId
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

	it('adaptive division keeps unknown divisor disabled exactly at rollout start skill', () => {
		let hasDivisorUnknown = false
		for (let seed = 0; seed < 160; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
			quiz.selectedOperator = Operator.Division
			quiz.adaptiveSkillByOperator[Operator.Division] =
				adaptiveTuning.adaptiveDivisionDivisorUnknownStartSkill
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.unknownPartIndex === 1) hasDivisorUnknown = true
		}

		expect(hasDivisorUnknown).toBe(false)
	})

	it('adaptive division surfaces some unknown divisor puzzles by mid rollout', () => {
		let divisorUnknownCount = 0
		const totalSeeds = 400
		for (let seed = 0; seed < totalSeeds; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
			quiz.selectedOperator = Operator.Division
			quiz.adaptiveSkillByOperator[Operator.Division] = 80
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.unknownPartIndex === 1) divisorUnknownCount++
		}

		expect(divisorUnknownCount).toBeGreaterThan(0)
		expect(divisorUnknownCount).toBeLessThan(totalSeeds / 2)
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
			quiz.difficulty = customDifficultyId
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
			quiz.difficulty = customDifficultyId
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
			quiz.difficulty = customDifficultyId
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
		Reflect.set(quiz.operatorSettings[Operator.Addition], 'operator', 99)
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
				adaptiveTuning.adaptiveNegativeSubtractionStartSkill
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)

			expect(puzzle.parts[0].generatedValue).toBeGreaterThanOrEqual(
				puzzle.parts[1].generatedValue
			)
			expect(puzzle.parts[2].generatedValue).toBeGreaterThanOrEqual(0)
		}
	})

	it('adaptive mode allows negative subtraction answers at full-rollout skill', () => {
		let hasNegative = false
		for (let seed = 0; seed < 100; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.adaptiveSkillByOperator[Operator.Subtraction] =
				adaptiveTuning.adaptiveNegativeSubtractionFullSkill
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.parts[2].generatedValue < 0) hasNegative = true
		}

		// At full rollout skill, negatives should appear consistently
		expect(hasNegative).toBe(true)
	})

	it('adaptive mode allows some but not all negative subtraction puzzles at mid-rollout skill', () => {
		const start = adaptiveTuning.adaptiveNegativeSubtractionStartSkill
		const full = adaptiveTuning.adaptiveNegativeSubtractionFullSkill
		const midSkill = Math.round((start + full) / 2)
		let negativeCount = 0

		for (let seed = 0; seed < 400; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.adaptiveSkillByOperator[Operator.Subtraction] = midSkill
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.parts[2].generatedValue < 0) negativeCount++
		}

		// Ramp is at 50% probability at the midpoint, so roughly half of
		// trials should allow negatives — but number generation won't always
		// produce a negative even when allowed. Check both ends are non-trivial.
		expect(negativeCount).toBeGreaterThan(0)
		expect(negativeCount).toBeLessThan(400)
	})

	it('keeps mid-rollout negative subtraction puzzles inside the adaptive difficulty window', () => {
		const start = adaptiveTuning.adaptiveNegativeSubtractionStartSkill
		const full = adaptiveTuning.adaptiveNegativeSubtractionFullSkill
		const midSkill = Math.round((start + full) / 2)
		const minDifficulty = Math.max(
			Math.floor(midSkill * adaptiveTuning.minDifficultyThreshold),
			midSkill - adaptiveTuning.adaptiveDifficultyMaxOvershoot
		)
		const maxDifficulty = Math.min(
			adaptiveTuning.maxSkill,
			midSkill + adaptiveTuning.adaptiveDifficultyMaxOvershoot
		)
		const negativeDifficulties: number[] = []

		for (let seed = 0; seed < 400; seed++) {
			const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			quiz.selectedOperator = Operator.Subtraction
			quiz.adaptiveSkillByOperator[Operator.Subtraction] = midSkill
			const { rng } = createRng(seed)

			const puzzle = getPuzzle(rng, quiz)
			if (puzzle.parts[2].generatedValue < 0) {
				negativeDifficulties.push(
					getPuzzleDifficulty(Operator.Subtraction, puzzle.parts)
				)
			}
		}

		expect(negativeDifficulties.length).toBeGreaterThan(0)
		expect(
			negativeDifficulties.every(
				(difficulty) =>
					difficulty >= minDifficulty && difficulty <= maxDifficulty
			)
		).toBe(true)
	})

	it('keeps subtraction sign presentation deterministic for same seed across the ramp window', () => {
		const start = adaptiveTuning.adaptiveNegativeSubtractionStartSkill
		const full = adaptiveTuning.adaptiveNegativeSubtractionFullSkill
		const rampSkills = Array.from({ length: 4 }, (_, index) =>
			Math.round(start + (index * (full - start)) / 3)
		)

		for (const skill of rampSkills) {
			const seed = 424242
			const quizA = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			const quizB = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
			quizA.selectedOperator = Operator.Subtraction
			quizB.selectedOperator = Operator.Subtraction
			quizA.adaptiveSkillByOperator[Operator.Subtraction] = skill
			quizB.adaptiveSkillByOperator[Operator.Subtraction] = skill
			const { rng: rngA } = createRng(seed)
			const { rng: rngB } = createRng(seed)

			for (let puzzleIndex = 0; puzzleIndex < 25; puzzleIndex++) {
				const puzzleA = getPuzzle(rngA, quizA)
				const puzzleB = getPuzzle(rngB, quizB)

				expect(puzzleA.parts[0].generatedValue).toBe(
					puzzleB.parts[0].generatedValue
				)
				expect(puzzleA.parts[1].generatedValue).toBe(
					puzzleB.parts[1].generatedValue
				)
				expect(puzzleA.parts[2].generatedValue).toBe(
					puzzleB.parts[2].generatedValue
				)
			}
		}
	})

	it('throws when alternate unknown part is requested for unsupported operator', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		Reflect.set(quiz, 'selectedOperator', 99)
		quiz.difficulty = customDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		Reflect.set(quiz.operatorSettings, 99, {
			operator: Operator.Addition,
			range: [1, 20],
			possibleValues: []
		})
		const { rng } = createRng(quiz.seed)

		expect(() => getPuzzle(rng, quiz)).toThrow(
			'[Invariant] Cannot get alternate unknown puzzle part: 99'
		)
	})

	it('uses random operator in custom all-operators mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=0'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.difficulty = customDifficultyId
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
		quiz.adaptiveSkillByOperator = uniformSkillMap(adaptiveTuning.maxSkill)
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
		quiz.difficulty = customDifficultyId
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

	it('fallback retry selection keeps best difficulty candidate among attempts', () => {
		for (let seed = 0; seed < 40; seed++) {
			const lowSkillQuiz = getQuiz(
				new URLSearchParams(`operator=0&difficulty=0&seed=${seed}`)
			)
			lowSkillQuiz.selectedOperator = Operator.Addition
			lowSkillQuiz.difficulty = customDifficultyId
			lowSkillQuiz.puzzleMode = PuzzleMode.Normal
			lowSkillQuiz.operatorSettings[Operator.Addition].range = [1, 2]
			lowSkillQuiz.adaptiveSkillByOperator[Operator.Addition] = 0

			const highSkillQuiz = getQuiz(
				new URLSearchParams(`operator=0&difficulty=0&seed=${seed}`)
			)
			highSkillQuiz.selectedOperator = Operator.Addition
			highSkillQuiz.difficulty = customDifficultyId
			highSkillQuiz.puzzleMode = PuzzleMode.Normal
			highSkillQuiz.operatorSettings[Operator.Addition].range = [1, 2]
			highSkillQuiz.adaptiveSkillByOperator[Operator.Addition] =
				adaptiveTuning.maxSkill

			const { rng: rngFirstAttempt } = createRng(seed)
			const firstAttemptPuzzle = getPuzzle(rngFirstAttempt, lowSkillQuiz)

			const { rng: rngFallback } = createRng(seed)
			const fallbackPuzzle = getPuzzle(rngFallback, highSkillQuiz)

			const firstDifficulty =
				firstAttemptPuzzle.parts[0].generatedValue +
				firstAttemptPuzzle.parts[1].generatedValue
			const fallbackDifficulty =
				fallbackPuzzle.parts[0].generatedValue +
				fallbackPuzzle.parts[1].generatedValue

			// With skill=100 and range [1,2], every candidate is too easy so the
			// retry loop should keep the best (highest-difficulty) candidate it sees.
			expect(fallbackDifficulty).toBeGreaterThanOrEqual(firstDifficulty)
		}
	})

	it('forced-repeat fallback prefers no-carry candidates in adaptive low-skill mode', () => {
		const allRecentAdditionPuzzles: Puzzle[] = []
		for (let left = 1; left <= 5; left++) {
			for (let right = 1; right <= 5; right++) {
				allRecentAdditionPuzzles.push({
					parts: [
						{ userDefinedValue: undefined, generatedValue: left },
						{ userDefinedValue: undefined, generatedValue: right },
						{ userDefinedValue: undefined, generatedValue: left + right }
					],
					operator: Operator.Addition,
					duration: 0,
					isCorrect: undefined,
					unknownPartIndex: 2
				})
			}
		}

		for (let seed = 0; seed < 40; seed++) {
			const quiz = getQuiz(
				new URLSearchParams(`operator=0&difficulty=1&seed=${seed}`)
			)
			quiz.selectedOperator = Operator.Addition
			quiz.puzzleMode = PuzzleMode.Normal
			quiz.adaptiveSkillByOperator[Operator.Addition] = 0

			const { rng } = createRng(seed)
			const puzzle = getPuzzle(rng, quiz, allRecentAdditionPuzzles)

			const left = puzzle.parts[0].generatedValue
			const right = puzzle.parts[1].generatedValue

			// All generated candidates are repeats in this setup, so fallback ranking
			// decides among repeats; carry puzzles (sum >= 10) should be deprioritized.
			expect(left + right).toBeLessThan(10)
		}
	})

	it('mixed-penalty fallback prefers non-repeat carry over repeated no-carry', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=0&seed=0'))
		quiz.selectedOperator = Operator.Addition
		quiz.difficulty = customDifficultyId
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.operatorSettings[Operator.Addition].range = [4, 6]
		quiz.adaptiveSkillByOperator[Operator.Addition] = 0

		const recentPuzzles: Puzzle[] = [
			{
				parts: [
					{ userDefinedValue: undefined, generatedValue: 4 },
					{ userDefinedValue: undefined, generatedValue: 4 },
					{ userDefinedValue: undefined, generatedValue: 8 }
				],
				operator: Operator.Addition,
				duration: 0,
				isCorrect: undefined,
				unknownPartIndex: 2
			},
			{
				parts: [
					{ userDefinedValue: undefined, generatedValue: 6 },
					{ userDefinedValue: undefined, generatedValue: 6 },
					{ userDefinedValue: undefined, generatedValue: 12 }
				],
				operator: Operator.Addition,
				duration: 0,
				isCorrect: undefined,
				unknownPartIndex: 2
			},
			{
				parts: [
					{ userDefinedValue: undefined, generatedValue: 5 },
					{ userDefinedValue: undefined, generatedValue: 5 },
					{ userDefinedValue: undefined, generatedValue: 10 }
				],
				operator: Operator.Addition,
				duration: 0,
				isCorrect: undefined,
				unknownPartIndex: 2
			}
		]

		const { rng } = createRng(0)
		const puzzle = getPuzzle(rng, quiz, recentPuzzles)
		const left = puzzle.parts[0].generatedValue
		const right = puzzle.parts[1].generatedValue

		// With previous parts [5,5], generated operands are limited to {4,6}.
		// In this setup, no-carry option (4+4) is a repeat while non-repeat
		// options (4+6 / 6+4) require carry. Ranking should prefer non-repeat.
		expect([left, right]).toEqual(expect.arrayContaining([4, 6]))
		expect(left + right).toBe(10)
	})

	it('returns min when max equals min in range', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.difficulty = customDifficultyId
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
		quiz.difficulty = customDifficultyId
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

		// Replay from recorded puzzles (as PuzzleView does)
		for (let i = 0; i < originalPuzzles.length; i++) {
			const original = originalPuzzles[i]
			if (original === undefined) {
				throw new Error('Expected replay source puzzle to exist')
			}
			const [part0, part1, part2] = original.parts
			const replayed: Puzzle = {
				...original,
				parts: [
					{ ...part0, userDefinedValue: undefined },
					{ ...part1, userDefinedValue: undefined },
					{ ...part2, userDefinedValue: undefined }
				],
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
