import { expect, test } from '@playwright/test'
import { installFastTimers } from './e2eHelpers'

test('supports starting a quiz while offline after initial load', async ({
	page,
	context
}) => {
	// Use a higher cap so the quiz timer doesn't expire before we can
	// verify the puzzle screen loaded. Cap of 50ms causes the 30-second
	// quiz to end in 50ms, making "Oppgave 1" disappear before assertion.
	await installFastTimers(page, 2000)
	await page.goto('/')

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

	await expect(
		page.getByRole('heading', { name: 'Velg regneart' })
	).toBeVisible()
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.getByRole('radio', { name: 'Automatisk' }).check()
	await page.getByRole('button', { name: 'Start' }).click()

	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 5_000 })

	await context.setOffline(false)
})
