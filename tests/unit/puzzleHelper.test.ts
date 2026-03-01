import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPuzzle } from '../../src/helpers/puzzleHelper'
import { getQuiz } from '../../src/helpers/quizHelper'
import { customAdaptiveDifficultyId } from '../../src/models/AdaptiveProfile'
import { Operator, OperatorExtended } from '../../src/models/constants/Operator'
import { PuzzleMode } from '../../src/models/constants/PuzzleMode'
import type { Puzzle } from '../../src/models/Puzzle'

describe('puzzleHelper', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('creates addition puzzle with expected result in normal mode', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.puzzleMode = PuzzleMode.Normal

		const randomMock = vi
			.spyOn(Math, 'random')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0.2)

		const puzzle = getPuzzle(quiz)

		expect(randomMock).toHaveBeenCalled()
		expect(puzzle.operator).toBe(Operator.Addition)
		expect(puzzle.unknownPuzzlePart).toBe(2)
		expect(puzzle.parts[0].generatedValue).toBe(1)
		expect(puzzle.parts[1].generatedValue).toBe(1)
		expect(puzzle.parts[2].generatedValue).toBe(2)
	})

	it('avoids negative subtraction answers when disabled', () => {
		const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
		quiz.selectedOperator = Operator.Subtraction
		quiz.puzzleMode = PuzzleMode.Normal
		quiz.allowNegativeAnswers = false

		vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.parts[0].generatedValue).toBeGreaterThanOrEqual(
			puzzle.parts[1].generatedValue
		)
		expect(puzzle.parts[2].generatedValue).toBeGreaterThanOrEqual(0)
	})

	it('does not reuse previous multiplication value when alternatives exist', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		quiz.operatorSettings[Operator.Multiplication].possibleValues = [7, 9]
		quiz.adaptiveSkillByOperator[Operator.Multiplication] = 100

		const previousPuzzle: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 7 },
				{ userDefinedValue: undefined, generatedValue: 4 },
				{ userDefinedValue: undefined, generatedValue: 28 }
			],
			operator: Operator.Multiplication,
			timeout: false,
			duration: 0,
			isCorrect: undefined,
			unknownPuzzlePart: 1
		}

		vi.spyOn(Math, 'random')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0.9)
			.mockReturnValueOnce(0)

		const puzzle = getPuzzle(quiz, previousPuzzle)

		expect(puzzle.parts[0].generatedValue).toBe(9)
		expect(puzzle.parts[2].generatedValue).toBe(
			puzzle.parts[0].generatedValue * puzzle.parts[1].generatedValue
		)
		expect(puzzle.unknownPuzzlePart).toBe(1)
	})

	it('uses random operator when selected operator is All', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All

		vi.spyOn(Math, 'random').mockReturnValue(0)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.operator).toBe(Operator.Addition)
	})

	it('in adaptive all mode, very low average skill can include subtraction', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [0, 0, 0, 0]

		vi.spyOn(Math, 'random').mockReturnValue(0.3)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.operator).toBe(Operator.Subtraction)
	})

	it('in adaptive all mode, very low average skill can include multiplication', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [0, 0, 0, 0]

		vi.spyOn(Math, 'random').mockReturnValue(0.6)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.operator).toBe(Operator.Multiplication)
	})

	it('in adaptive all mode, very low average skill can include division', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [0, 0, 0, 0]

		vi.spyOn(Math, 'random').mockReturnValue(0.99)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.operator).toBe(Operator.Division)
	})

	it('in adaptive all mode, high average skill can include division', () => {
		const quiz = getQuiz(new URLSearchParams('operator=4&difficulty=1'))
		quiz.selectedOperator = OperatorExtended.All
		quiz.adaptiveSkillByOperator = [80, 80, 80, 80]

		vi.spyOn(Math, 'random').mockReturnValue(0.99)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.operator).toBe(Operator.Division)
	})

	it('throws when selected operator is undefined', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = undefined

		expect(() => getPuzzle(quiz)).toThrow(
			'Cannot get operator: parameter is undefined'
		)
	})

	it('uses single multiplication value directly when only one is configured', () => {
		const quiz = getQuiz(new URLSearchParams('operator=2&difficulty=1'))
		quiz.selectedOperator = Operator.Multiplication
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.operatorSettings[Operator.Multiplication].possibleValues = [8]

		vi.spyOn(Math, 'random').mockReturnValueOnce(0)

		const puzzle = getPuzzle(quiz)

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

		vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.unknownPuzzlePart).toBe(0)
		expect(puzzle.parts[2].generatedValue).toBe(
			puzzle.parts[0].generatedValue / puzzle.parts[1].generatedValue
		)
	})

	it('keeps unknown part as answer in random mode when alternate is not chosen', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Random

		vi.spyOn(Math, 'random')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0.2)
			.mockReturnValueOnce(0.1)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.unknownPuzzlePart).toBe(2)
	})

	it('uses alternate subtraction branch 0 in random mode when chosen', () => {
		const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
		quiz.selectedOperator = Operator.Subtraction
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Random

		vi.spyOn(Math, 'random')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0.9)
			.mockReturnValueOnce(0.9)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.unknownPuzzlePart).toBe(0)
	})

	it('uses previous division puzzle values to compute excluded seed value', () => {
		const quiz = getQuiz(new URLSearchParams('operator=3&difficulty=1'))
		quiz.selectedOperator = Operator.Division

		const previousPuzzle: Puzzle = {
			parts: [
				{ userDefinedValue: undefined, generatedValue: 20 },
				{ userDefinedValue: undefined, generatedValue: 5 },
				{ userDefinedValue: undefined, generatedValue: 4 }
			],
			operator: Operator.Division,
			timeout: false,
			duration: 0,
			isCorrect: undefined,
			unknownPuzzlePart: 0
		}

		vi.spyOn(Math, 'random').mockReturnValueOnce(0.4).mockReturnValueOnce(0)

		const puzzle = getPuzzle(quiz, previousPuzzle)

		expect(puzzle.parts[2].generatedValue).not.toBe(4)
		expect(puzzle.parts[0].generatedValue).toBe(
			puzzle.parts[1].generatedValue * puzzle.parts[2].generatedValue
		)
	})

	it('uses alternate subtraction unknown part branch that returns 1', () => {
		const quiz = getQuiz(new URLSearchParams('operator=1&difficulty=1'))
		quiz.selectedOperator = Operator.Subtraction
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate

		vi.spyOn(Math, 'random')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(0.1)

		const puzzle = getPuzzle(quiz)

		expect(puzzle.unknownPuzzlePart).toBe(1)
	})

	it('throws when puzzle settings use unsupported operator', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = Operator.Addition
		quiz.operatorSettings[Operator.Addition].operator = 99 as Operator

		expect(() => getPuzzle(quiz)).toThrow(
			'Cannot get puzzleParts: Operator not recognized'
		)
	})

	it('throws when alternate unknown part is requested for unsupported operator', () => {
		const quiz = getQuiz(new URLSearchParams('operator=0&difficulty=1'))
		quiz.selectedOperator = 99 as OperatorExtended
		quiz.difficulty = customAdaptiveDifficultyId
		quiz.puzzleMode = PuzzleMode.Alternate
		;(quiz.operatorSettings as unknown as Record<number, unknown[]>)[99] = {
			operator: Operator.Addition,
			range: [1, 20],
			possibleValues: [],
			score: 0
		} as unknown as never[]

		vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.2)

		expect(() => getPuzzle(quiz)).toThrow('No operator defined')
	})
})
