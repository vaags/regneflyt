import { expect, test, type Page } from '@playwright/test'
import {
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	submitAnswer,
	waitForNextPuzzle
} from './e2eHelpers'

async function configureAdaptiveAddition(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify({
				adaptive: [38, 0, 0, 0],
				custom: [0, 0, 0, 0]
			})
		)
	})

	await page.goto('/?duration=0.5&showSettings=true')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-1"]').click()
}

async function configureAdaptiveAll(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify({
				adaptive: [100, 100, 100, 0],
				custom: [0, 0, 0, 0]
			})
		)
	})

	await page.goto('/?duration=5&showSettings=true')
	await page.getByRole('radio', { name: 'Alle regnearter' }).check()
	await page.locator('label[for="l-1"]').click()
}

async function configureCustomAdaptiveAddition(page: Page) {
	await page.goto('/?duration=0.5&showSettings=true')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-0"]').click()
	await page.selectOption('#partOneMin-0', '10')
	await page.selectOption('#partOneMax-0', '20')
	await page.getByRole('radio', { name: 'Normal' }).check()
}

test('adaptive mode gradually progresses from normal to non-normal unknown part', async ({
	page
}) => {
	await configureAdaptiveAddition(page)

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 8000 })

	const firstPuzzle = await readPuzzle(page)
	expect(firstPuzzle.unknownIndex).toBe(2)

	let observedNonNormalUnknownPart = false

	for (let i = 0; i < 8; i++) {
		const puzzle = await readPuzzle(page)
		const puzzleNumber = await readPuzzleNumber(page)
		const answer = solvePuzzle(puzzle)

		await submitAnswer(page, answer)
		await waitForNextPuzzle(page, puzzleNumber)

		const nextPuzzle = await readPuzzle(page)
		if (nextPuzzle.unknownIndex !== 2) {
			observedNonNormalUnknownPart = true
			break
		}
	}

	expect(observedNonNormalUnknownPart).toBe(true)
})

test('custom adaptive mode keeps generated addition operands within selected bounds', async ({
	page
}) => {
	await configureCustomAdaptiveAddition(page)

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 8000 })

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

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 8000 })

	let observedDivision = false

	for (let i = 0; i < 8; i++) {
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
