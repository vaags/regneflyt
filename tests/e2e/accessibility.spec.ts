import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const colorScheme of ['light', 'dark'] as const) {
	test(`main menu has no critical or serious accessibility violations (${colorScheme})`, async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme })
		await page.goto('/')
		await page.waitForLoadState('networkidle')
		await expect(page.getByText('Velg regneart')).toBeVisible()

		const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
		const criticalOrSeriousViolations =
			accessibilityScanResults.violations.filter((violation) =>
				['critical', 'serious'].includes(violation.impact ?? '')
			)

		expect(criticalOrSeriousViolations).toEqual([])
	})
}
