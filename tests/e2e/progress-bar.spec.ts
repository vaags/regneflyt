import { expect, test } from '@playwright/test'
import { waitForApp, waitForPuzzle } from './e2eHelpers'

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
		allowNegativeAnswers: 'false',
		showProgressBar: 'true'
	}).toString()

test.describe('progress bar', () => {
	test('is visible as soon as the first puzzle appears', async ({ page }) => {
		// Inject a MutationObserver that captures whether the progress bar
		// exists in the DOM at the exact moment the puzzle becomes ready.
		// Uses the stable data-puzzle-state attribute instead of parsing
		// animated text, eliminating race conditions with tween animations.
		await page.addInitScript(() => {
			const start = () => {
				new MutationObserver((_, obs) => {
					const form = document.querySelector('[data-puzzle-state="ready"]')
					if (form) {
						document.body.setAttribute(
							'data-bar-on-mount',
							document.querySelector('[data-testid="progress-bar"]') !== null
								? 'true'
								: 'false'
						)
						obs.disconnect()
					}
				}).observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ['data-puzzle-state']
				})
			}
			if (document.body) start()
			else document.addEventListener('DOMContentLoaded', start)
		})

		await page.goto(`/${quizUrl}`)
		await waitForApp(page)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page, 7000)

		const barPresent = await page
			.locator('body')
			.getAttribute('data-bar-on-mount')
		expect(barPresent).toBe('true')
	})
})
