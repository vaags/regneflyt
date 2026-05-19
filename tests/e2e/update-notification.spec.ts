import { expect, test } from '@playwright/test'
import { cleanupServiceWorkerTestState } from './fixtures'
import {
	toggleDevTools,
	waitForApp,
	waitForSettingsRouteHydration
} from './e2eHelpers'

test.describe('update notification', () => {
	test.afterEach(async ({ page, context }) => {
		await cleanupServiceWorkerTestState(page, context)
	})

	// eslint-disable-next-line playwright/no-skipped-test -- requires dev-mode simulate-update control not available in CI production preview; CI-safe update assertions live in update-lifecycle.spec.ts
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

	test('re-shows update notification after dismiss when simulate-update is triggered again', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await toggleDevTools(page)
		const simulateButton = page.getByTestId('btn-simulate-update')
		await expect(simulateButton).toBeVisible()

		const updateNotification = page.getByRole('alert')
		await simulateButton.click()
		await expect(updateNotification).toBeVisible()

		await page.getByTestId('btn-update-notification-dismiss').click()
		await expect(updateNotification).toBeHidden()

		await simulateButton.click()
		await expect(updateNotification).toBeVisible()
	})
})
