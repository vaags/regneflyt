import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
	expandAllCollapsedPanels,
	openConfiguredMenu,
	waitForApp
} from './e2eHelpers'

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

test('forced colors mode falls back to native form control rendering', async ({
	page
}) => {
	await page.emulateMedia({ forcedColors: 'active' })
	await openConfiguredMenu(page, 'operator=0&difficulty=0')
	await expandAllCollapsedPanels(page)

	const select = page.locator('select').first()
	const radio = page.getByTestId('difficulty-0')

	await expect(select).toBeVisible()
	await expect(radio).toBeVisible()

	const [selectStyles, radioStyles] = await Promise.all([
		select.evaluate((element) => {
			const style = window.getComputedStyle(element)
			return {
				appearance: style.appearance,
				backgroundImage: style.backgroundImage,
				forcedColorAdjust: style.forcedColorAdjust
			}
		}),
		radio.evaluate((element) => {
			const style = window.getComputedStyle(element)
			return {
				appearance: style.appearance,
				backgroundImage: style.backgroundImage,
				forcedColorAdjust: style.forcedColorAdjust
			}
		})
	])

	await openConfiguredMenu(page, 'operator=1&difficulty=0')
	await expandAllCollapsedPanels(page)

	const checkbox = page.locator("input[type='checkbox']").first()
	await expect(checkbox).toBeVisible()

	const checkboxStyles = await checkbox.evaluate((element) => {
		const style = window.getComputedStyle(element)
		return {
			appearance: style.appearance,
			backgroundImage: style.backgroundImage,
			forcedColorAdjust: style.forcedColorAdjust
		}
	})

	expect(selectStyles.appearance).not.toBe('none')
	expect(radioStyles.appearance).not.toBe('none')
	expect(checkboxStyles.appearance).not.toBe('none')
	expect(selectStyles.backgroundImage).toBe('none')
	expect(radioStyles.backgroundImage).toBe('none')
	expect(checkboxStyles.backgroundImage).toBe('none')
	expect(selectStyles.forcedColorAdjust).toBe('auto')
	expect(radioStyles.forcedColorAdjust).toBe('auto')
	expect(checkboxStyles.forcedColorAdjust).toBe('auto')
})
