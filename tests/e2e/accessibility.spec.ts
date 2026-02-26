import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('main menu has no critical or serious accessibility violations', async ({
	page
}) => {
	await page.goto('/')

	const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
	const criticalOrSeriousViolations =
		accessibilityScanResults.violations.filter((violation) =>
			['critical', 'serious'].includes(violation.impact ?? '')
		)

	expect(criticalOrSeriousViolations).toEqual([])
})
