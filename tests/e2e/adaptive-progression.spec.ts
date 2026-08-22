import { expect, test, type Page } from '@playwright/test'
import { Operator } from '../../src/lib/constants/Operator'
import type { AdaptiveSkillMap } from '../../src/lib/models/AdaptiveProfile'
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
import {
	adaptiveDifficultyWindowOvershoot,
	adaptiveDifficultyWindowSlack,
	adaptiveDifficultyWebkitEarlySessionSlack,
	adaptiveMinWindowSize,
	adaptiveSkillBounds,
	getAdaptivePuzzleDifficulty
} from '../helpers/adaptiveTestConstants'

type ResolvedPuzzleValues = [left: number, right: number, result: number]

function uniformSkillMap(skill: number): AdaptiveSkillMap {
	return [skill, skill, skill, skill]
}

async function configureAdaptiveAddition(page: Page) {
	await page.goto('/?duration=0')
	await waitForApp(page)
	const { minSkill } = adaptiveSkillBounds
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

async function configureAdaptiveOperator(page: Page, operator: Operator) {
	await page.goto('/?duration=0')
	await waitForApp(page)
	const { minSkill } = adaptiveSkillBounds
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

function getResolvedPuzzleValues(puzzle: ParsedPuzzle): ResolvedPuzzleValues {
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

function getOperatorIdFromParsedPuzzle(puzzle: ParsedPuzzle): Operator {
	switch (puzzle.operator) {
		case '+':
			return Operator.Addition
		case '-':
			return Operator.Subtraction
		case '*':
			return Operator.Multiplication
		case '/':
			return Operator.Division
	}

	throw new Error(`Unsupported operator: ${puzzle.operator}`)
}

async function configureAdaptiveAll(page: Page) {
	await page.goto('/?duration=5')
	await waitForApp(page)
	const { minSkill, maxSkill } = adaptiveSkillBounds
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
	page,
	browserName
}) => {
	const operators = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	for (const operator of operators) {
		await configureAdaptiveOperator(page, operator)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)
		const maxOvershoot = adaptiveDifficultyWindowOvershoot
		const difficultyWindowSlack = adaptiveDifficultyWindowSlack
		const browserSlack =
			browserName === 'webkit' ? adaptiveDifficultyWebkitEarlySessionSlack : 0

		for (let i = 0; i < 8; i++) {
			const puzzle = await readPuzzle(page)
			const puzzleNumber = await readPuzzleNumber(page)
			const values = getResolvedPuzzleValues(puzzle)
			const actualOperator = getOperatorIdFromParsedPuzzle(puzzle)
			const difficulty = getAdaptivePuzzleDifficulty(actualOperator, values)
			const maxExpectedDifficulty =
				maxOvershoot + difficultyWindowSlack + browserSlack

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
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	for (const operator of operators) {
		await page.goto('/?duration=0')
		await waitForApp(page)
		const { maxSkill } = adaptiveSkillBounds
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
		const minWindowSize = adaptiveMinWindowSize
		const difficultyWindowSlack = adaptiveDifficultyWindowSlack
		const sampleCount = operator === Operator.Division ? 20 : 8

		for (let i = 0; i < sampleCount; i++) {
			const puzzle = await readPuzzle(page)
			const puzzleNumber = await readPuzzleNumber(page)
			const values = getResolvedPuzzleValues(puzzle)
			const actualOperator = getOperatorIdFromParsedPuzzle(puzzle)
			const difficulty = getAdaptivePuzzleDifficulty(actualOperator, values)
			const minExpectedDifficulty =
				maxSkill - minWindowSize - difficultyWindowSlack

			expect(difficulty).toBeGreaterThanOrEqual(minExpectedDifficulty)

			await submitAnswer(page, solvePuzzle(puzzle))
			await waitForNextPuzzle(page, puzzleNumber)
		}
	}
})
