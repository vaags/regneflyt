import { expect, test } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer
} from './e2eHelpers'

/**
 * Complete a quiz quickly using fast timers. Solves the first puzzle
 * correctly, then lets the quiz timer expire via accelerated timers.
 */
async function completeQuiz(page: import('@playwright/test').Page) {
	await installFastTimers(page, 2000)
	await page.goto('/?duration=0.5')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-1"]').click()

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 5_000 })

	// Solve the first puzzle correctly
	const puzzle = await readPuzzle(page)
	await submitAnswer(page, solvePuzzle(puzzle))

	await expect(page.getByText('Resultater')).toBeVisible({ timeout: 10_000 })
}

test('correct answer shows checkmark, score, and skill section on results', async ({
	page
}) => {
	await completeQuiz(page)

	// At least one correct answer should show a checkmark
	await expect(page.getByLabel('Riktig').first()).toBeVisible()

	// Score and percentage should be displayed
	await expect(page.getByText('poeng')).toBeVisible()
	await expect(page.getByText('%')).toBeVisible()

	// Skill and puzzle sections should be visible
	await expect(page.getByText('Ferdighetsnivå')).toBeVisible()
	await expect(page.getByText('Oppgaver')).toBeVisible()
})

test('can start another quiz from results screen', async ({ page }) => {
	await completeQuiz(page)

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Gjør deg klar ...')).toBeVisible()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7_000 })
})

test('can navigate back to menu from results screen', async ({ page }) => {
	await completeQuiz(page)

	await page.getByRole('button', { name: 'Meny' }).click()
	await expect(page.getByText('Velg regneart')).toBeVisible()
})

test('can view last results from menu after completing a quiz', async ({
	page
}) => {
	await completeQuiz(page)

	await page.getByRole('button', { name: 'Meny' }).click()
	await expect(page.getByText('Velg regneart')).toBeVisible()

	await page.getByRole('button', { name: 'Resultater' }).click()
	await expect(page.getByText('Resultater')).toBeVisible()
	await expect(page.getByText('poeng')).toBeVisible()
	await expect(page.getByLabel('Riktig').first()).toBeVisible()
})
