import { expect, test } from '@playwright/test'

test('supports starting a quiz while offline after initial load', async ({
	page,
	context
}) => {
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
	await page.locator('label[for="l-1"]').click()
	await page.getByRole('button', { name: 'Start' }).click()

	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

	await context.setOffline(false)
})
