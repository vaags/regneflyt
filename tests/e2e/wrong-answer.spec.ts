import { expect, test } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer
} from './e2eHelpers'

test('submitting a wrong answer shows cross icon in results', async ({
	page
}) => {
	// Use a higher cap (2s) so the quiz timer doesn't expire before we can
	// read the puzzle and submit an answer. Cap of 50ms causes the 30-second
	// quiz to end in 50ms, creating a race condition.
	await installFastTimers(page, 2000)
	await page.goto('/?duration=0.5')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-1"]').click()

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 5_000 })

	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	await submitAnswer(page, correctAnswer + 1)

	// Quiz timer + game-over separator fire almost instantly via fast timers
	await expect(page.getByText('Resultater')).toBeVisible({ timeout: 5_000 })
	await expect(page.getByLabel('Galt')).toBeVisible()
	await expect(page.getByLabel('Riktig')).not.toBeVisible()
})
