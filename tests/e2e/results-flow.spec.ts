import { expect, test } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer,
	waitForPuzzle
} from './e2eHelpers'

/**
 * Complete a quiz quickly using fast timers. Solves the first puzzle
 * correctly, then lets the quiz timer expire via accelerated timers.
 */
async function completeQuiz(page: import('@playwright/test').Page) {
	await installFastTimers(page, 2000)
	await page.goto('/?duration=0.5')
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	// Solve the first puzzle correctly
	const puzzle = await readPuzzle(page)
	await submitAnswer(page, solvePuzzle(puzzle))

	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})
}

test('correct answer shows checkmark and skill section on results', async ({
	page
}) => {
	await completeQuiz(page)

	// At least one correct answer should show a checkmark
	await expect(page.getByTestId('icon-correct').first()).toBeVisible()

	// Percentage should be displayed
	await expect(page.getByRole('cell', { name: /\d+\s*%/ })).toBeVisible()

	// Skill and puzzle sections should be visible
	await expect(page.getByTestId('heading-results-skill')).toBeVisible()
	await expect(page.getByTestId('heading-puzzles')).toBeVisible()
})

test('can start another quiz from results screen', async ({ page }) => {
	await completeQuiz(page)

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page, 7_000)
})

test('can navigate back to menu from results screen', async ({ page }) => {
	await completeQuiz(page)

	await page.getByTestId('btn-menu').click()
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
})

test('can view last results from menu after completing a quiz', async ({
	page
}) => {
	await completeQuiz(page)

	await page.getByTestId('btn-menu').click()
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()

	await page.getByTestId('btn-results').click()
	await expect(page.getByTestId('heading-results')).toBeVisible()
	await expect(page.getByTestId('icon-correct').first()).toBeVisible()
})

test('wrong answer shows cross icon and no checkmarks in results', async ({
	page
}) => {
	await installFastTimers(page, 2000)
	await page.goto('/?duration=0.5')
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	await submitAnswer(page, correctAnswer + 1)

	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 5_000
	})

	// Wrong answer markers
	await expect(page.getByTestId('icon-incorrect')).toBeVisible()
	await expect(page.getByTestId('icon-correct')).not.toBeVisible()

	// Correct percentage should be 0 (no correct answers)
	await expect(page.getByRole('cell', { name: /^0\s*%/ })).toBeVisible()
})
