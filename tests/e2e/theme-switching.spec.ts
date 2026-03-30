import { expect, test, type Page } from '@playwright/test'
import { waitForApp, waitForSettingsRouteHydration } from './e2eHelpers'

async function readRootThemeState(page: Page) {
	return page.evaluate(() => {
		const root = document.documentElement
		const computed = getComputedStyle(root)
		return {
			isDark: root.classList.contains('dark'),
			backgroundImage: computed.backgroundImage
		}
	})
}

test.describe('theme switching', () => {
	test('updates root gradient immediately after post-hydration theme toggles', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(true)

		await page.getByTestId('settings-theme-light').check()

		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(false)
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(231, 229, 228)')
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(214, 211, 209)')

		await page.getByTestId('settings-theme-dark').check()

		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(true)
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(41, 37, 36)')
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(28, 25, 23)')
	})
})
