import { expect, test } from '@playwright/test'
import { waitForApp, waitForSettingsRouteHydration } from './e2eHelpers'

test.describe('update notification', () => {
	test.skip(
		!!process.env.CI,
		'Requires dev mode simulate-update control; CI runs production preview'
	)

	test('shows update notification when simulate-update is triggered', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('btn-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await page.getByTestId('btn-simulate-update').click()
		await expect(page.getByRole('alert')).toBeVisible()
	})
})
