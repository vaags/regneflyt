import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { waitForApp } from './e2eHelpers'

for (const colorScheme of ['light', 'dark'] as const) {
	test(`main menu has no WCAG AAA accessibility violations (${colorScheme})`, async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme })
		await page.goto('/')
		await waitForApp(page)

		const { violations } = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
			.analyze()

		expect(violations).toEqual([])
	})
}
