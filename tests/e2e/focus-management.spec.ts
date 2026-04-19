import { expect, test } from '@playwright/test'
import { waitForApp, waitForPuzzle } from './e2eHelpers'

test.describe('focus management for results navigation', () => {
	test('results button remains keyboard reachable on quiz route', async ({
		page
	}) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const resultsButton = page.getByTestId('btn-results')
		await resultsButton.focus()
		await expect(resultsButton).toBeFocused()
	})
})
