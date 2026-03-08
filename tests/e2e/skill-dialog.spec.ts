import { expect, test, type Page } from '@playwright/test'

function seedSkillProfiles(page: Page) {
	return page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify([80, 60, 40, 20])
		)
	})
}

test('skill percentage in header opens skill dialog', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/')
	await page.waitForLoadState('networkidle')

	const skillButton = page.getByRole('button', { name: /\d+%/ })
	await expect(skillButton).toBeVisible()
	await skillButton.click()

	const dialog = page.getByRole('dialog')
	await expect(dialog).toBeVisible()
	await expect(dialog.getByText('Ferdighetsnivå')).toBeVisible()
})

test('skill dialog shows per-operator breakdown', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/')
	await page.waitForLoadState('networkidle')

	await page.getByRole('button', { name: /\d+%/ }).click()

	const dialog = page.getByRole('dialog')
	await expect(dialog.getByText('Addisjon')).toBeVisible()
	await expect(dialog.getByText('Subtraksjon')).toBeVisible()
	await expect(dialog.getByText('Multiplikasjon')).toBeVisible()
	await expect(dialog.getByText('Divisjon')).toBeVisible()

	await expect(dialog.getByText('80%')).toBeVisible()
	await expect(dialog.getByText('60%')).toBeVisible()
	await expect(dialog.getByText('40%')).toBeVisible()
	await expect(dialog.getByText('20%')).toBeVisible()

	// Overall: (80+60+40+20)/4 = 50
	await expect(dialog.getByText('Totalt: 50%')).toBeVisible()
})

test('skill dialog closes with close button', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/')
	await page.waitForLoadState('networkidle')

	await page.getByRole('button', { name: /\d+%/ }).click()
	await expect(page.getByRole('dialog')).toBeVisible()

	await page.getByRole('button', { name: 'Lukk' }).click()
	await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('skill button is hidden when all skills are 0', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('button', { name: /\d+%/ })).not.toBeVisible()
})
