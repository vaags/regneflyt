import { expect, test } from '@playwright/test'
import { cleanupServiceWorkerTestState } from './fixtures'
import { installServiceWorkerMock } from './serviceWorkerMock'
import {
	toggleDevTools,
	waitForApp,
	waitForSettingsRouteHydration
} from './e2eHelpers'
import { usesProductionE2eServer } from './e2eServerMode'

test.describe('update notification layout', () => {
	test.afterEach(async ({ page, context }) => {
		await cleanupServiceWorkerTestState(page, context)
	})

	test('sits clear of the global nav', async ({ page }) => {
		await installServiceWorkerMock(page, true)

		await page.goto('/')
		await waitForApp(page)

		const updateNotification = page.getByTestId('update-notification-alert')
		const globalNav = page.getByTestId('global-nav')

		await expect(updateNotification).toBeVisible()
		await expect(globalNav).toBeVisible()

		const updateNotificationBox = await updateNotification.boundingBox()
		const globalNavBox = await globalNav.boundingBox()

		if (updateNotificationBox === null || globalNavBox === null) {
			throw new Error('Both the notification and the nav must be laid out')
		}

		expect(updateNotificationBox.y + updateNotificationBox.height).toBeLessThan(
			globalNavBox.y
		)
	})
})

test.describe('update notification dev control', () => {
	test.afterEach(async ({ page, context }) => {
		await cleanupServiceWorkerTestState(page, context)
	})

	// eslint-disable-next-line playwright/no-skipped-test -- exercises the dev-mode simulate-update control, which production-preview runs do not ship
	test.skip(
		usesProductionE2eServer,
		'Requires dev mode simulate-update control; production-preview runs omit it'
	)

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

		const updateNotification = page.getByTestId('update-notification-alert')
		await simulateButton.click()
		await expect(updateNotification).toBeVisible()

		await page.getByTestId('btn-update-notification-dismiss').click()
		await expect(updateNotification).toBeHidden()

		await simulateButton.click()
		await expect(updateNotification).toBeVisible()
	})
})
