import { describe, expect, it } from 'vitest'
import { Operator } from '$lib/constants/Operator'
import { PuzzleMode } from '$lib/constants/PuzzleMode'
import type { Puzzle } from '$lib/models/Puzzle'
import type {
	ConceptPerformance,
	ConceptWeakness,
	PuzzleConcept
} from '$lib/models/PuzzleConcept'
import {
	detectCarryBorrow,
	buildConceptPerformanceMap,
	analyzeWeaknesses,
	getTopSystematicWeaknesses,
	getTopSystematicWeakness
} from '$lib/helpers/errorPatternHelper'

function makePuzzle(params: {
	operator: Operator
	a: number
	b: number
	c: number
	isCorrect: boolean
	duration: number
	puzzleMode?: 0 | 1 | 2
	unknownPartIndex?: 0 | 1 | 2
}): Puzzle {
	return {
		operator: params.operator,
		parts: [
			{ generatedValue: params.a, userDefinedValue: undefined },
			{ generatedValue: params.b, userDefinedValue: undefined },
			{ generatedValue: params.c, userDefinedValue: undefined }
		],
		duration: params.duration,
		isCorrect: params.isCorrect,
		...(params.puzzleMode !== undefined
			? { puzzleMode: params.puzzleMode }
			: {}),
		unknownPartIndex: params.unknownPartIndex ?? 2
	}
}

describe('errorPatternHelper', () => {
	it('detects carry in addition and borrow in subtraction', () => {
		expect(detectCarryBorrow(19, 8, Operator.Addition)).toEqual({
			hasCarry: true
		})
		expect(detectCarryBorrow(41, 29, Operator.Subtraction)).toEqual({
			hasBorrow: true
		})
	})

	it('builds concept stats including algebraic and large-table concepts', () => {
		const puzzles: Puzzle[] = [
			makePuzzle({
				operator: Operator.Multiplication,
				a: 12,
				b: 4,
				c: 48,
				isCorrect: false,
				duration: 2.0,
				puzzleMode: PuzzleMode.Alternate,
				unknownPartIndex: 1
			}),
			makePuzzle({
				operator: Operator.Division,
				a: 84,
				b: 7,
				c: 12,
				isCorrect: true,
				duration: 1.8,
				puzzleMode: PuzzleMode.Random,
				unknownPartIndex: 0
			})
		]

		const map = buildConceptPerformanceMap(puzzles)

		expect(map.get('multiplication-facts-11to14')?.total).toBe(1)
		expect(map.get('multiplication-algebraic')?.total).toBe(1)
		expect(map.get('division-large-tables')?.total).toBe(1)
		expect(map.get('division-algebraic')?.correct).toBe(1)
	})

	it('prioritizes carry/borrow concepts over basic concepts', () => {
		const puzzles: Puzzle[] = [
			makePuzzle({
				operator: Operator.Addition,
				a: 19,
				b: 8,
				c: 27,
				isCorrect: false,
				duration: 1.1
			}),
			makePuzzle({
				operator: Operator.Subtraction,
				a: 41,
				b: 29,
				c: 12,
				isCorrect: false,
				duration: 1.2
			})
		]

		const map = buildConceptPerformanceMap(puzzles)

		expect(map.get('addition-carry')?.total).toBe(1)
		expect(map.get('subtraction-borrow')?.total).toBe(1)
		expect(map.has('addition-basic')).toBe(false)
		expect(map.has('subtraction-basic')).toBe(false)
	})

	it('marks 0% accuracy as systematic even with fast average duration', () => {
		const conceptStats: Map<PuzzleConcept, ConceptPerformance> = new Map([
			[
				'addition-basic',
				{
					concept: 'addition-basic',
					correct: 0,
					total: 3,
					avgDuration: 0.4
				}
			]
		])

		const [weakness] = analyzeWeaknesses(conceptStats)
		expect(weakness?.isSystematic).toBe(true)
		expect(weakness?.accuracy).toBe(0)
	})

	it('does not mark quick non-zero low accuracy as systematic', () => {
		const conceptStats: Map<PuzzleConcept, ConceptPerformance> = new Map([
			[
				'addition-basic',
				{
					concept: 'addition-basic',
					correct: 1,
					total: 3,
					avgDuration: 0.5
				}
			]
		])

		const [weakness] = analyzeWeaknesses(conceptStats)
		expect(weakness?.isSystematic).toBe(false)
	})

	it('marks repeated quick low accuracy as systematic', () => {
		const conceptStats: Map<PuzzleConcept, ConceptPerformance> = new Map([
			[
				'addition-basic',
				{
					concept: 'addition-basic',
					correct: 2,
					total: 5,
					avgDuration: 0.5
				}
			]
		])

		const [weakness] = analyzeWeaknesses(conceptStats)
		expect(weakness?.isSystematic).toBe(true)
	})

	it('returns top N only from systematic weaknesses', () => {
		const weaknesses: ConceptWeakness[] = [
			{
				concept: 'addition-basic',
				failureCount: 3,
				totalAttempts: 3,
				accuracy: 0,
				avgDuration: 0.4,
				isSystematic: true
			},
			{
				concept: 'subtraction-basic',
				failureCount: 2,
				totalAttempts: 4,
				accuracy: 0.5,
				avgDuration: 2.0,
				isSystematic: true
			},
			{
				concept: 'division-facts',
				failureCount: 1,
				totalAttempts: 5,
				accuracy: 0.8,
				avgDuration: 2.0,
				isSystematic: false
			}
		]

		const top = getTopSystematicWeaknesses([...weaknesses], 1)
		expect(top).toHaveLength(1)
		expect(top[0]?.concept).toBe('addition-basic')
	})

	it('returns top systematic weakness from concept stats map', () => {
		const conceptStats: Map<PuzzleConcept, ConceptPerformance> = new Map([
			[
				'addition-basic',
				{
					concept: 'addition-basic',
					correct: 0,
					total: 3,
					avgDuration: 0.4
				}
			]
		])

		const top = getTopSystematicWeaknesses(
			analyzeWeaknesses(conceptStats),
			1
		)[0]
		expect(top?.concept).toBe('addition-basic')
		expect(top?.isSystematic).toBe(true)
	})

	it('detectCarryBorrow returns empty object for multiplication and division', () => {
		expect(detectCarryBorrow(6, 7, Operator.Multiplication)).toEqual({})
		expect(detectCarryBorrow(42, 6, Operator.Division)).toEqual({})
	})

	it('detectCarryBorrow returns empty object when no carry or borrow needed', () => {
		expect(detectCarryBorrow(11, 2, Operator.Addition)).toEqual({})
		expect(detectCarryBorrow(50, 20, Operator.Subtraction)).toEqual({})
	})

	it('buildConceptPerformanceMap returns empty map for empty puzzle array', () => {
		expect(buildConceptPerformanceMap([])).toEqual(new Map())
	})

	it('buildConceptPerformanceMap is pure: same input produces same result', () => {
		const puzzles: Puzzle[] = [
			makePuzzle({
				operator: Operator.Addition,
				a: 19,
				b: 8,
				c: 27,
				isCorrect: false,
				duration: 1.1
			})
		]
		const first = buildConceptPerformanceMap(puzzles)
		const second = buildConceptPerformanceMap(puzzles)
		expect([...first]).toEqual([...second])
	})

	it('getTopSystematicWeakness returns null when no systematic weaknesses exist', () => {
		const conceptStats: Map<PuzzleConcept, ConceptPerformance> = new Map([
			[
				'addition-basic',
				{
					concept: 'addition-basic',
					correct: 3,
					total: 3,
					avgDuration: 0.5
				}
			]
		])
		expect(getTopSystematicWeakness(conceptStats)).toBeNull()
	})

	it('getTopSystematicWeakness returns the worst systematic weakness', () => {
		const conceptStats: Map<PuzzleConcept, ConceptPerformance> = new Map([
			[
				'addition-carry',
				{
					concept: 'addition-carry',
					correct: 0,
					total: 3,
					avgDuration: 0.4
				}
			],
			[
				'subtraction-basic',
				{
					concept: 'subtraction-basic',
					correct: 1,
					total: 3,
					avgDuration: 3.0
				}
			]
		])
		const result = getTopSystematicWeakness(conceptStats)
		expect(result).not.toBeNull()
		expect(result?.concept).toBe('addition-carry')
		expect(result?.isSystematic).toBe(true)
	})
})
