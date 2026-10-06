import { test, expect } from '@playwright/test'
import { openConfiguredMenu, waitForPuzzle } from './e2eHelpers'

test.describe('quiz layout', () => {
	test.use({ viewport: { width: 375, height: 667 } })

	test('keeps the puzzle panel height stable when the countdown yields to the first puzzle', async ({
		page
	}) => {
		await openConfiguredMenu(page, 'operator=0&difficulty=1&duration=0')
		await page.getByTestId('btn-start').click()
		const puzzlePanel = page.locator('[data-puzzle-state] [data-panel-surface]')
		const heightBeforeFirstPuzzle = await puzzlePanel.evaluate(
			(element) => element.getBoundingClientRect().height
		)
		await waitForPuzzle(page)
		const heightWithFirstPuzzle = await puzzlePanel.evaluate(
			(element) => element.getBoundingClientRect().height
		)

		expect(heightWithFirstPuzzle).toBeCloseTo(heightBeforeFirstPuzzle, 0)
	})
})
