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

		await navigator.serviceWorker.ready
	})

	await page.reload({ waitUntil: 'networkidle' })

	await context.setOffline(true)
	await page.reload({ waitUntil: 'domcontentloaded' })

	await expect(page.getByText('Velg regneart')).toBeVisible()
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.getByRole('radio', { name: 'Automatisk' }).check()
	await page.getByRole('button', { name: 'Start' }).click()

	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 5_000 })

	await context.setOffline(false)
})
