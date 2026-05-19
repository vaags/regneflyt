import { expect, test } from '@playwright/test'
import { expandAllCollapsedPanels, openConfiguredMenu } from './e2eHelpers'

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
	expect([undefined, 'auto']).toContain(selectStyles.forcedColorAdjust)
	expect([undefined, 'auto']).toContain(radioStyles.forcedColorAdjust)
	expect([undefined, 'auto']).toContain(checkboxStyles.forcedColorAdjust)
})
