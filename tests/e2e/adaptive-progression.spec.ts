import { expect, test, type Page } from '@playwright/test'
import {
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	submitAnswer,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'

async function configureAdaptiveAddition(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify([0, 0, 0, 0])
		)
	})

	await page.goto('/?duration=0&showSettings=true')
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()
}

async function configureAdaptiveAll(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify([100, 100, 100, 0])
		)
	})

	await page.goto('/?duration=5&showSettings=true')
	await page.getByTestId('operator-4').check()
	await page.getByTestId('difficulty-1').check()
}

async function configureCustomAdaptiveAddition(page: Page) {
	await page.goto('/?duration=0.5&showSettings=true')
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
		// Wait for tween animation to finish so readPuzzle gets stable values
		await page.waitForTimeout(600)
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
