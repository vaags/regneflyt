import { expect, test } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer
} from './e2eHelpers'

const quizUrl =
	'?' +
	new URLSearchParams({
		duration: '0.5',
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
		await page.goto(`/${quizUrl}`)
		await page.getByRole('button', { name: 'Start' }).click()
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

		const barPresent = await page
			.locator('body')
			.getAttribute('data-bar-on-mount')
		expect(barPresent).toBe('true')
	})

	test('resets to blue for the next puzzle after answering', async ({
		page
	}) => {
		await installFastTimers(page)
		await page.goto(`/${quizUrl}`)
		await page.getByRole('button', { name: 'Start' }).click()
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))

		// After answering, the next puzzle should show a blue bar
		await expect(page.getByText('Oppgave 2')).toBeVisible({ timeout: 7000 })
		await expect(page.locator('.bg-blue-400')).toBeAttached({ timeout: 5000 })
		await expect(page.locator('.bg-red-600')).not.toBeAttached()
	})
})
