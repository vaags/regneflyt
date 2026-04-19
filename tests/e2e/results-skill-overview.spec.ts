import { expect, test, type Page } from '@playwright/test'
import { ADAPTIVE_PROFILES_KEY } from './e2eHelpers'

function seedSkillProfiles(page: Page) {
	return page.addInitScript((key) => {
		window.localStorage.setItem(key, JSON.stringify([80, 60, 40, 20]))
	}, ADAPTIVE_PROFILES_KEY)
}

test('results skill overview shows per-operator breakdown', async ({
	page
}) => {
	await seedSkillProfiles(page)
	await page.goto('/results')
	await expect(page.getByTestId('heading-results')).toBeVisible()

	// Verify operator skill bars by testid + progressbar aria-valuenow
	for (const [operator, expected] of [
		[0, 80],
		[1, 60],
		[2, 40],
		[3, 20]
	] as const) {
		const bar = page.getByTestId(`skill-overall-operator-${operator}`)
		await expect(bar).toBeVisible()
		await expect(bar.getByRole('progressbar')).toHaveAttribute(
			'aria-valuenow',
			String(expected)
		)
	}
})
