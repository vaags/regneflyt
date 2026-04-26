import { expect, test, type Page } from '@playwright/test'
import {
	ADAPTIVE_PROFILES_KEY,
	type ParsedPuzzle,
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'
import { getAdaptiveDifficultyWindowSlack } from '../helpers/adaptiveTestConstants'

const ADDITION_OPERATOR = 0
const SUBTRACTION_OPERATOR = 1
const MULTIPLICATION_OPERATOR = 2
const DIVISION_OPERATOR = 3

type AdaptiveProfileRuntimeModule = {
	adaptiveTuning: {
		minSkill: number
		maxSkill: number
		adaptiveDifficultyMaxOvershoot: number
		algebraicSkillOffset: number
		incorrectPenaltyBase: number
		incorrectPenaltySlownessFactor: number
	}
}

type RuntimePuzzlePart = {
	generatedValue: number
	userDefinedValue: undefined
}

type AdaptiveHelperRuntimeModule = {
	getPuzzleDifficulty: (operator: number, parts: RuntimePuzzlePart[]) => number
}

function uniformSkillMap(skill: number): [number, number, number, number] {
	return [skill, skill, skill, skill]
}

async function getAdaptiveSkillBounds(
	page: Page
): Promise<{ minSkill: number; maxSkill: number }> {
	return page.evaluate(
		async (): Promise<{ minSkill: number; maxSkill: number }> => {
			const adaptiveProfileModulePath = '/src/lib/models/AdaptiveProfile.ts'
			const adaptiveProfileModule = (await import(
				/* @vite-ignore */ adaptiveProfileModulePath
			)) as AdaptiveProfileRuntimeModule

			return {
				minSkill: adaptiveProfileModule.adaptiveTuning.minSkill,
				maxSkill: adaptiveProfileModule.adaptiveTuning.maxSkill
			}
		}
	)
}

async function configureAdaptiveAddition(page: Page) {
	await page.goto('/?duration=0')
	await waitForApp(page)
	const { minSkill } = await getAdaptiveSkillBounds(page)
	await page.evaluate(
		({ key, skillMap }) => {
			window.localStorage.setItem(key, JSON.stringify(skillMap))
		},
		{ key: ADAPTIVE_PROFILES_KEY, skillMap: uniformSkillMap(minSkill) }
	)

	await page.goto('/?duration=0')
	await waitForApp(page)
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()
}

async function configureAdaptiveOperator(page: Page, operator: number) {
	await page.goto('/?duration=0')
	await waitForApp(page)
	const { minSkill } = await getAdaptiveSkillBounds(page)
	await page.evaluate(
		({ key, skillMap }) => {
			window.localStorage.setItem(key, JSON.stringify(skillMap))
		},
		{ key: ADAPTIVE_PROFILES_KEY, skillMap: uniformSkillMap(minSkill) }
	)

	await page.goto('/?duration=0')
	await waitForApp(page)
	await page.getByTestId(`operator-${operator}`).check()
	await page.getByTestId('difficulty-1').check()
}

function getResolvedPuzzleValues(
	puzzle: ParsedPuzzle
): [number, number, number] {
	const values: Array<number | undefined> = [
		puzzle.left,
		puzzle.right,
		puzzle.result
	]
	values[puzzle.unknownIndex] = solvePuzzle(puzzle)

	if (values.some((value) => value === undefined)) {
		throw new Error('Expected all puzzle values to be resolved')
	}

	return [values[0]!, values[1]!, values[2]!]
}

function getOperatorIdFromParsedPuzzle(puzzle: ParsedPuzzle): number {
	switch (puzzle.operator) {
		case '+':
			return ADDITION_OPERATOR
		case '-':
			return SUBTRACTION_OPERATOR
		case '*':
			return MULTIPLICATION_OPERATOR
		case '/':
			return DIVISION_OPERATOR
	}

	throw new Error(`Unsupported operator: ${puzzle.operator}`)
}

async function getAdaptiveDifficultyMaxOvershoot(page: Page): Promise<number> {
	return page.evaluate(async (): Promise<number> => {
		const adaptiveProfileModulePath = '/src/lib/models/AdaptiveProfile.ts'
		const adaptiveProfileModule = (await import(
			/* @vite-ignore */ adaptiveProfileModulePath
		)) as AdaptiveProfileRuntimeModule
		return adaptiveProfileModule.adaptiveTuning.adaptiveDifficultyMaxOvershoot
	})
}

async function getAdaptiveDifficultyWindowSlackForAssertions(
	page: Page
): Promise<number> {
	const inputs = await page.evaluate(
		async (): Promise<{
			incorrectPenaltyBase: number
			incorrectPenaltySlownessFactor: number
		}> => {
			const adaptiveProfileModulePath = '/src/lib/models/AdaptiveProfile.ts'
			const adaptiveProfileModule = (await import(
				/* @vite-ignore */ adaptiveProfileModulePath
			)) as AdaptiveProfileRuntimeModule

			return {
				incorrectPenaltyBase:
					adaptiveProfileModule.adaptiveTuning.incorrectPenaltyBase,
				incorrectPenaltySlownessFactor:
					adaptiveProfileModule.adaptiveTuning.incorrectPenaltySlownessFactor
			}
		}
	)

	return getAdaptiveDifficultyWindowSlack(inputs)
}

async function getAlgebraicSkillOffset(page: Page): Promise<number> {
	return page.evaluate(async (): Promise<number> => {
		const adaptiveProfileModulePath = '/src/lib/models/AdaptiveProfile.ts'
		const adaptiveProfileModule = (await import(
			/* @vite-ignore */ adaptiveProfileModulePath
		)) as AdaptiveProfileRuntimeModule
		return adaptiveProfileModule.adaptiveTuning.algebraicSkillOffset
	})
}

async function getIntrinsicPuzzleDifficulty(
	page: Page,
	operator: number,
	values: [number, number, number]
): Promise<number> {
	return page.evaluate<
		number,
		{ op: number; resolvedValues: [number, number, number] }
	>(
		async ({ op, resolvedValues }): Promise<number> => {
			const adaptiveHelperModulePath = '/src/lib/helpers/adaptiveHelper.ts'
			const adaptiveHelperModule = (await import(
				/* @vite-ignore */ adaptiveHelperModulePath
			)) as AdaptiveHelperRuntimeModule
			const parts: RuntimePuzzlePart[] = [
				{ generatedValue: resolvedValues[0], userDefinedValue: undefined },
				{ generatedValue: resolvedValues[1], userDefinedValue: undefined },
				{ generatedValue: resolvedValues[2], userDefinedValue: undefined }
			]
			return adaptiveHelperModule.getPuzzleDifficulty(op, parts)
		},
		{ op: operator, resolvedValues: values }
	)
}

async function configureAdaptiveAll(page: Page) {
	await page.goto('/?duration=5')
	await waitForApp(page)
	const { minSkill, maxSkill } = await getAdaptiveSkillBounds(page)
	await page.evaluate(
		({ key, skillMap }) => {
			window.localStorage.setItem(key, JSON.stringify(skillMap))
		},
		{
			key: ADAPTIVE_PROFILES_KEY,
			skillMap: [maxSkill, maxSkill, maxSkill, minSkill]
		}
	)

	await page.goto('/?duration=5')
	await waitForApp(page)
	await page.getByTestId('operator-4').check()
	await page.getByTestId('difficulty-1').check()
}

async function configureCustomAdaptiveAddition(page: Page) {
	await page.goto('/?duration=0.5')
	await waitForApp(page)
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-0').check()
	await page.selectOption('#partOneMin-0', '10')
	await page.selectOption('#partOneMax-0', '20')
	await page.getByTestId('puzzle-mode-0').check()
}

test('adaptive mode gradually progresses from normal to non-normal unknown part', async ({
	page
}) => {
	await configureAdaptiveAddition(page)

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	let observedNonNormalUnknownPart = false

	for (let i = 0; i < 20; i++) {
		const puzzle = await readPuzzle(page)
		if (puzzle.unknownIndex !== 2) {
			observedNonNormalUnknownPart = true
			break
		}

		const puzzleNumber = await readPuzzleNumber(page)
		const answer = solvePuzzle(puzzle)

		await submitAnswer(page, answer)
		await waitForNextPuzzle(page, puzzleNumber)
	}

	expect(observedNonNormalUnknownPart).toBe(true)
})

test('custom adaptive mode keeps generated addition operands within selected bounds', async ({
	page
}) => {
	await configureCustomAdaptiveAddition(page)

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	for (let i = 0; i < 8; i++) {
		const puzzle = await readPuzzle(page)
		const puzzleNumber = await readPuzzleNumber(page)

		expect(puzzle.unknownIndex).toBe(2)
		expect(puzzle.left).toBeGreaterThanOrEqual(10)
		expect(puzzle.left).toBeLessThanOrEqual(20)
		expect(puzzle.right).toBeGreaterThanOrEqual(10)
		expect(puzzle.right).toBeLessThanOrEqual(20)

		const answer = solvePuzzle(puzzle)
		await submitAnswer(page, answer)

		if (i < 7) await waitForNextPuzzle(page, puzzleNumber)
	}
})

test('adaptive all operators can include division early without global randomness override', async ({
	page
}) => {
	await configureAdaptiveAll(page)

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	let observedDivision = false

	for (let i = 0; i < 15; i++) {
		const puzzle = await readPuzzle(page)

		if (puzzle.operator === '/') {
			observedDivision = true
			break
		}

		const puzzleNumber = await readPuzzleNumber(page)
		await submitAnswer(page, solvePuzzle(puzzle))
		await waitForNextPuzzle(page, puzzleNumber)
	}

	expect(observedDivision).toBe(true)
})

test('adaptive skill-0 early session avoids high intrinsic difficulty spikes', async ({
	page
}) => {
	const operators = [
		ADDITION_OPERATOR,
		SUBTRACTION_OPERATOR,
		MULTIPLICATION_OPERATOR,
		DIVISION_OPERATOR
	]

	for (const operator of operators) {
		await configureAdaptiveOperator(page, operator)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)
		const maxOvershoot = await getAdaptiveDifficultyMaxOvershoot(page)
		const difficultyWindowSlack =
			await getAdaptiveDifficultyWindowSlackForAssertions(page)

		for (let i = 0; i < 8; i++) {
			const puzzle = await readPuzzle(page)
			const puzzleNumber = await readPuzzleNumber(page)
			const values = getResolvedPuzzleValues(puzzle)
			const actualOperator = getOperatorIdFromParsedPuzzle(puzzle)
			const difficulty = await getIntrinsicPuzzleDifficulty(
				page,
				actualOperator,
				values
			)
			const maxExpectedDifficulty = maxOvershoot + difficultyWindowSlack

			expect(difficulty).toBeLessThanOrEqual(maxExpectedDifficulty)

			// Submit a wrong answer to keep skill pinned near 0 in this scenario.
			await submitAnswer(page, solvePuzzle(puzzle) + 1)
			await waitForNextPuzzle(page, puzzleNumber)
		}
	}
})

test('adaptive skill-100 early session avoids very easy intrinsic puzzles', async ({
	page
}) => {
	const operators = [
		ADDITION_OPERATOR,
		SUBTRACTION_OPERATOR,
		MULTIPLICATION_OPERATOR,
		DIVISION_OPERATOR
	]

	for (const operator of operators) {
		await page.goto('/?duration=0')
		await waitForApp(page)
		const { maxSkill } = await getAdaptiveSkillBounds(page)
		await page.evaluate(
			({ key, skillMap }) => {
				window.localStorage.setItem(key, JSON.stringify(skillMap))
			},
			{ key: ADAPTIVE_PROFILES_KEY, skillMap: uniformSkillMap(maxSkill) }
		)

		await page.goto('/?duration=0')
		await waitForApp(page)
		await page.getByTestId(`operator-${operator}`).check()
		await page.getByTestId('difficulty-1').check()

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)
		const maxOvershoot = await getAdaptiveDifficultyMaxOvershoot(page)
		const difficultyWindowSlack =
			await getAdaptiveDifficultyWindowSlackForAssertions(page)
		const algebraicSkillOffset = await getAlgebraicSkillOffset(page)
		const sampleCount = operator === DIVISION_OPERATOR ? 20 : 8

		for (let i = 0; i < sampleCount; i++) {
			const puzzle = await readPuzzle(page)
			const puzzleNumber = await readPuzzleNumber(page)
			const values = getResolvedPuzzleValues(puzzle)
			const actualOperator = getOperatorIdFromParsedPuzzle(puzzle)
			const difficulty = await getIntrinsicPuzzleDifficulty(
				page,
				actualOperator,
				values
			)
			const effectiveSkill =
				puzzle.unknownIndex === 0 || puzzle.unknownIndex === 1
					? maxSkill - algebraicSkillOffset
					: maxSkill
			const minExpectedDifficulty =
				effectiveSkill - maxOvershoot - difficultyWindowSlack

			expect(difficulty).toBeGreaterThanOrEqual(minExpectedDifficulty)

			await submitAnswer(page, solvePuzzle(puzzle))
			await waitForNextPuzzle(page, puzzleNumber)
		}
	}
})
