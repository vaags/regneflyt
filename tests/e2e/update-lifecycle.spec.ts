import { expect, test } from '@playwright/test'
import { cleanupServiceWorkerTestState } from './fixtures'
import {
	installServiceWorkerMock,
	type SwTestHandle
} from './serviceWorkerMock'
import { waitForApp } from './e2eHelpers'

test.describe('service worker update lifecycle', () => {
	test.afterEach(async ({ page, context }) => {
		await cleanupServiceWorkerTestState(page, context)
	})

	test('keeps UI stable when install is interrupted', async ({ page }) => {
		await installServiceWorkerMock(page, false)

		await page.goto('/')
		await waitForApp(page)

		await page.evaluate(() => {
			const handle = (window as unknown as { __swTest: SwTestHandle }).__swTest
			handle.triggerInterruptedUpdate()
		})

		await expect(page.getByTestId('update-notification-alert')).toHaveCount(0)
	})

	test('reload fallback still works when waiting worker becomes redundant', async ({
		page
	}) => {
		await installServiceWorkerMock(page, true)

		await page.goto('/')
		await waitForApp(page)
		await expect(page.getByTestId('update-notification-alert')).toBeVisible()

		await page.evaluate(() => {
			const handle = (window as unknown as { __swTest: SwTestHandle }).__swTest
			handle.triggerWaitingRedundant()
		})

		await expect
			.poll(async () => {
				return page.evaluate(() =>
					(
						window as unknown as { __swTest: SwTestHandle }
					).__swTest.isWaitingWorkerRedundant()
				)
			})
			.toBeTruthy()

		// Ensure the post-reload document sees no waiting worker once the old one is redundant.
		await installServiceWorkerMock(page, false)

		const reload = page.waitForNavigation({ waitUntil: 'domcontentloaded' })
		await page.getByTestId('btn-update-notification-update').first().click()
		await reload

		await expect(page.getByTestId('update-notification-alert')).toHaveCount(0)
	})

	test('keeps update notification after route navigation round-trip', async ({
		page
	}) => {
		await installServiceWorkerMock(page, true)

		await page.goto('/')
		await waitForApp(page)
		await expect(page.getByTestId('update-notification-alert')).toBeVisible()

		await page.goto('/settings')
		await expect(page.getByTestId('settings-panel')).toBeVisible()

		await page.goto('/')
		await waitForApp(page)
		await expect(page.getByTestId('update-notification-alert')).toBeVisible()
		await expect(
			page.getByTestId('btn-update-notification-update')
		).toBeVisible()
	})
})
