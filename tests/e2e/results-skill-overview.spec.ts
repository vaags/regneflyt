import { expect, test } from '@playwright/test'
import { setAdaptiveSkills } from './e2eHelpers'

test('results skill overview shows per-operator breakdown', async ({
	page
}) => {
	await setAdaptiveSkills(page, [80, 60, 40, 20])
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
