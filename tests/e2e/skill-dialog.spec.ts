import { expect, test, type Page } from '@playwright/test'
import { ADAPTIVE_PROFILES_KEY, waitForApp } from './e2eHelpers'

function seedSkillProfiles(page: Page) {
	return page.addInitScript((key) => {
		window.localStorage.setItem(key, JSON.stringify([80, 60, 40, 20]))
	}, ADAPTIVE_PROFILES_KEY)
}

test('skill percentage in header opens skill dialog', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/')
	await waitForApp(page)

	const skillButton = page.getByRole('button', { name: /\d+%/ })
	await expect(skillButton).toBeVisible()
	await skillButton.click()

	const dialog = page.getByRole('dialog')
	await expect(dialog).toBeVisible()
	await expect(dialog.getByTestId('heading-skill-level')).toBeVisible()
})

test('skill dialog shows per-operator breakdown', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/')
	await waitForApp(page)

	await page.getByRole('button', { name: /\d+%/ }).click()

	const dialog = page.getByRole('dialog')

	// Verify operator skill bars by testid + progressbar aria-valuenow
	for (const [operator, expected] of [
		[0, 80],
		[1, 60],
		[2, 40],
		[3, 20]
	] as const) {
		const bar = dialog.getByTestId(`skill-operator-${operator}`)
		await expect(bar).toBeVisible()
		await expect(bar.getByRole('progressbar')).toHaveAttribute(
			'aria-valuenow',
			String(expected)
		)
	}

	// Overall: (80+60+40+20)/4 = 50
	const total = dialog.getByTestId('skill-total')
	await expect(total).toBeVisible()
	await expect(total).toContainText('50%')
})

test('skill dialog closes with close button', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/')
	await waitForApp(page)

	await page.getByRole('button', { name: /\d+%/ }).click()
	await expect(page.getByRole('dialog')).toBeVisible()

	await page.getByRole('dialog').getByTestId('btn-dialog-close').click()
	await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('skill button is hidden when all skills are 0', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByRole('button', { name: /\d+%/ })).not.toBeVisible()
})
