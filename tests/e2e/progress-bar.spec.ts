import { expect, test } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer
} from './e2eHelpers'

const quizWithTimeLimit =
	'?' +
	new URLSearchParams({
		duration: '0.5',
		timeLimit: '3',
		operator: '0',
		addMin: '1',
		addMax: '5',
		subMin: '1',
		subMax: '10',
		mulValues: '1,2',
		divValues: '1,2',
		puzzleMode: '0',
		difficulty: '1',
		allowNegativeAnswers: 'false'
	}).toString()

test.describe('progress bar', () => {
	test('is visible as soon as the first puzzle appears', async ({ page }) => {
		// Inject a MutationObserver that captures whether the progress bar
		// exists in the DOM at the exact moment "Oppgave 1" first appears.
		// This guards against a regression where the bar only renders after
		// a timer delay instead of immediately with the puzzle.
		await page.addInitScript(() => {
			const start = () => {
				new MutationObserver((_, obs) => {
					if (document.body?.textContent?.includes('Oppgave 1')) {
						document.body.setAttribute(
							'data-bar-on-mount',
							document.querySelector('.bg-blue-400') !== null ? 'true' : 'false'
						)
						obs.disconnect()
					}
				}).observe(document.body, { childList: true, subtree: true })
			}
			if (document.body) start()
			else document.addEventListener('DOMContentLoaded', start)
		})

		await installFastTimers(page)
		await page.goto(`/${quizWithTimeLimit}`)
		await page.getByRole('button', { name: 'Start' }).click()
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

		const barPresent = await page
			.locator('body')
			.getAttribute('data-bar-on-mount')
		expect(barPresent).toBe('true')
	})

	test('turns red on puzzle timeout', async ({ page }) => {
		// No fast timers — the red bar must be visible long enough to assert on.
		// With fast timers the timeout + countdown flash by in ~100ms.
		await page.goto(`/${quizWithTimeLimit}`)
		await page.getByRole('button', { name: 'Start' }).click()
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

		// Don't answer — let the puzzle timeout fire.
		// The bar should turn red when time is up.
		await expect(page.locator('.bg-red-600')).toBeVisible({ timeout: 10000 })
	})

	test('resets to blue for the next puzzle after answering', async ({
		page
	}) => {
		// No fast timers — need real 3s puzzle timeout window to answer in time
		await page.goto(`/${quizWithTimeLimit}`)
		await page.getByRole('button', { name: 'Start' }).click()
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))

		// After answering, the next puzzle should show a blue (not red) bar
		await expect(page.getByText('Oppgave 2')).toBeVisible({ timeout: 7000 })
		await expect(page.locator('.bg-blue-400')).toBeAttached({ timeout: 5000 })
		await expect(page.locator('.bg-red-600')).not.toBeAttached()
	})
})
