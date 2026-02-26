import { expect, test } from '@playwright/test'

test('serves offline fallback page when navigating without network', async ({
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

	await context.setOffline(true)
	await page.goto('/?offline-fallback-e2e=1', { waitUntil: 'domcontentloaded' })

	await expect(page.getByRole('heading', { name: 'Du er offline' })).toBeVisible()
	await expect(
		page.getByText('Regneflyt trenger internett for å laste denne siden akkurat nå.')
	).toBeVisible()

	await context.setOffline(false)
})