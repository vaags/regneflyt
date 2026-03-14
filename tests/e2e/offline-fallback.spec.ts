import { expect, test } from '@playwright/test'
import { waitForApp, waitForPuzzle } from './e2eHelpers'

// This test needs service workers to verify offline support.
test.use({ contextOptions: { serviceWorkers: 'allow' } })

test('supports starting a quiz while offline after initial load', async ({
	page,
	context
}) => {
	await page.goto('/?duration=0')
	await waitForApp(page)

	await page.evaluate(async () => {
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service worker is not supported in this environment')
		}

		const reg = await navigator.serviceWorker.ready

		// Wait until the SW is actively controlling this page, not just
		// installed. Without this the reload below can race against
		// activation and abort with net::ERR_ABORTED.
		if (!navigator.serviceWorker.controller) {
			await new Promise<void>((resolve) => {
				navigator.serviceWorker.addEventListener(
					'controllerchange',
					() => resolve(),
					{ once: true }
				)
				// If the SW is waiting, nudge it to activate
				reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
			})
		}
	})

	await context.setOffline(true)
	await page.reload({ waitUntil: 'domcontentloaded' })

	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()
	await page.getByTestId('btn-start').click()

	await waitForPuzzle(page)

	await context.setOffline(false)
})
