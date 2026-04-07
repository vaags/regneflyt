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
		await page.goto(`/${quizUrl}`)
		await waitForApp(page)

		const barOnFirstReadyPromise = page.evaluate(
			() =>
				new Promise<string>((resolve) => {
					const captureIfReady = () => {
						const form = document.querySelector('[data-puzzle-state="ready"]')
						if (form !== null) {
							resolve(
								document.querySelector('[data-testid="progress-bar"]') !== null
									? 'true'
									: 'false'
							)
							return true
						}
						return false
					}

					if (captureIfReady()) return

					const observer = new MutationObserver(() => {
						if (captureIfReady()) {
							observer.disconnect()
						}
					})

					observer.observe(document.documentElement, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: ['data-puzzle-state']
					})
				})
		)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page, 7000)

		const barPresent = await barOnFirstReadyPromise
		expect(barPresent).toBe('true')
	})
})
