import { expect, test } from '@playwright/test'
import {
	toggleDevTools,
	waitForApp,
	waitForSettingsRouteHydration
} from './e2eHelpers'

test.describe('update notification', () => {
	// eslint-disable-next-line playwright/no-skipped-test -- requires dev-mode simulate-update control not available in CI production preview
	test.skip(
		process.env.CI != null,
		'Requires dev mode simulate-update control; CI runs production preview'
	)

	test('shows update notification when simulate-update is triggered', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await toggleDevTools(page)
		await expect(page.getByTestId('btn-simulate-update')).toBeVisible()
		await page.getByTestId('btn-simulate-update').click()

		const updateNotification = page.getByRole('alert')
		const globalNav = page.getByTestId('global-nav')

		await expect(updateNotification).toBeVisible()
		await expect(globalNav).toBeVisible()

		const updateNotificationBox = await updateNotification.boundingBox()
		const globalNavBox = await globalNav.boundingBox()

		expect(updateNotificationBox).not.toBeNull()
		expect(globalNavBox).not.toBeNull()

		const updateNotificationBottom =
			updateNotificationBox!.y + updateNotificationBox!.height

		expect(updateNotificationBottom).toBeLessThan(globalNavBox!.y)
	})
})
