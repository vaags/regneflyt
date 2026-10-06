import { expect, test } from '@playwright/test'
import { setOperatorSkills } from './e2eHelpers'

test('results skill overview shows per-operator breakdown', async ({
	page
}) => {
	await setOperatorSkills(page, [80, 60, 40, 20])
	await page.goto('/results')
	await expect(page.getByTestId('heading-results')).toBeVisible()

	// Verify operator skill bars by testid + progressbar aria-valuenow
	const bars = [0, 1, 2, 3].map((operator) =>
		page.getByTestId(`skill-overall-operator-${operator}`)
	)
	for (const bar of bars) await expect(bar).toBeVisible()
	await expect
		.poll(() =>
			Promise.all(
				bars.map((bar) =>
					bar.getByRole('progressbar').getAttribute('aria-valuenow')
				)
			)
		)
		.toEqual(['80', '60', '40', '20'])
})
