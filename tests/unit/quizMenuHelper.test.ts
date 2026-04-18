import { describe, expect, it, vi } from 'vitest'
import { Operator, OperatorExtended } from '$lib/constants/Operator'
import { createTestQuiz } from './component-setup'
import type { Puzzle } from '$lib/models/Puzzle'

const { mockApplySkillUpdate, mockGetPuzzle } = vi.hoisted(() => ({
	mockApplySkillUpdate: vi.fn(),
	mockGetPuzzle: vi.fn()
}))

vi.mock('$lib/helpers/adaptiveHelper', () => ({
	applySkillUpdate: mockApplySkillUpdate
}))

vi.mock('$lib/helpers/puzzleHelper', () => ({
	getPuzzle: mockGetPuzzle
}))

import {
	buildQuizMenuSettingsKey,
	buildQuizMenuUrlSyncKey,
	getQuizMenuValidation,
	isAllOperatorsSelected,
	resolveNextQuizPreviewState
} from '$lib/helpers/quiz/quizMenuHelper'

function createPuzzle(operator: Operator = Operator.Addition): Puzzle {
	return {
		parts: [
			{ generatedValue: 1, userDefinedValue: 1 },
			{ generatedValue: 2, userDefinedValue: 2 },
			{ generatedValue: 3, userDefinedValue: undefined }
		],
		duration: 1,
		isCorrect: true,
		operator,
		unknownPartIndex: 2
	}
}

describe('quizMenuHelper', () => {
	it('validates operator settings and missing tables', () => {
		const quiz = createTestQuiz({ selectedOperator: OperatorExtended.All })
		quiz.operatorSettings[Operator.Multiplication].possibleValues = []
		quiz.operatorSettings[Operator.Division].possibleValues = []

		const validation = getQuizMenuValidation(quiz, true)

		expect(validation.hasError).toBe(true)
		expect(validation.hasInvalidAdditionRange).toBe(false)
		expect(validation.hasInvalidSubtractionRange).toBe(false)
	})

	it('detects invalid addition and subtraction ranges', () => {
		const quiz = createTestQuiz()
		quiz.operatorSettings[Operator.Addition].range = [10, 1]
		quiz.operatorSettings[Operator.Subtraction].range = [9, 2]

		const validation = getQuizMenuValidation(quiz, false)

		expect(validation.hasInvalidAdditionRange).toBe(true)
		expect(validation.hasInvalidSubtractionRange).toBe(true)
		expect(validation.hasError).toBe(true)
	})

	it('builds stable settings and url sync keys', () => {
		const quiz = createTestQuiz({ duration: 3, showPuzzleProgressBar: true })

		const settingsKey = buildQuizMenuSettingsKey(quiz)
		const urlSyncKey = buildQuizMenuUrlSyncKey(settingsKey, quiz)
		const parsedUrlSyncKey = JSON.parse(urlSyncKey) as [string, number, boolean]

		expect(settingsKey.length).toBeGreaterThan(0)
		expect(parsedUrlSyncKey).toEqual([settingsKey, 3, true])
	})

	it('identifies all-operator selection', () => {
		const allOperatorsQuiz = createTestQuiz({
			selectedOperator: OperatorExtended.All
		})
		const singleOperatorQuiz = createTestQuiz({
			selectedOperator: Operator.Addition
		})

		expect(isAllOperatorsSelected(allOperatorsQuiz)).toBe(true)
		expect(isAllOperatorsSelected(singleOperatorQuiz)).toBe(false)
	})

	it('resolves next preview and applies simulated skill update when puzzle exists', () => {
		const quiz = createTestQuiz()
		const currentPuzzle = createPuzzle(Operator.Subtraction)
		const nextPuzzle = createPuzzle(Operator.Addition)
		mockGetPuzzle.mockReturnValue(nextPuzzle)

		const result = resolveNextQuizPreviewState({
			quiz,
			previewRng: {} as never,
			currentPuzzle,
			lastPreviewGeneratedAt: 2_000,
			simulatedOutcome: 'correct',
			now: () => 5_000
		})

		expect(mockApplySkillUpdate).toHaveBeenCalledWith(
			quiz.adaptiveSkillByOperator,
			Operator.Subtraction,
			currentPuzzle.parts,
			true,
			3
		)
		expect(mockGetPuzzle).toHaveBeenCalledWith(expect.anything(), quiz, [
			currentPuzzle
		])
		expect(result).toEqual({ puzzle: nextPuzzle, generatedAt: 5_000 })
	})
})
