import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

type ActiveInfo = {
	tag: string
	id: string | null
	class: string | null
	visible: boolean
}

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`a11y extended (${colorScheme})`, () => {
		test(`menu and quiz screens have no critical or serious accessibility violations`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			// Navigate with query params so share panel can be opened (valid settings)
			await page.goto('/?operator=0&difficulty=1&showSettings=true')
			await page.waitForLoadState('networkidle')
			await expect(page.getByText('Velg regneart')).toBeVisible()

			let accessibilityScanResults = await new AxeBuilder({ page }).analyze()
			let criticalOrSeriousViolations =
				accessibilityScanResults.violations.filter((violation) =>
					['critical', 'serious'].includes(violation.impact ?? '')
				)

			expect(criticalOrSeriousViolations).toEqual([])

			// Try to start a quiz if a Start button exists and run Axe again on the quiz screen
			const startButtons = await page
				.getByRole('button', { name: /Start/i })
				.count()
			if (startButtons > 0) {
				const startButton = page.getByRole('button', { name: /Start/i }).first()
				await startButton.click()
				await page.waitForLoadState('networkidle')
				await expect(startButton).toBeHidden()

				accessibilityScanResults = await new AxeBuilder({ page }).analyze()
				criticalOrSeriousViolations =
					accessibilityScanResults.violations.filter((violation) =>
						['critical', 'serious'].includes(violation.impact ?? '')
					)

				expect(criticalOrSeriousViolations).toEqual([])
			}
		})

		test('basic keyboard focus flow (first interactive elements)', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await page.goto('/')
			await page.waitForLoadState('networkidle')

			// Tab through the first N focusable elements and assert the active element is visible
			const tabSteps = 12
			for (let i = 0; i < tabSteps; i++) {
				await page.keyboard.press('Tab')
				// read activeElement info
				const active = await page.evaluate<ActiveInfo | null>(() => {
					const el = document.activeElement as HTMLElement | null
					if (!el) return null
					const rect = el.getBoundingClientRect()
					const visible = !!(rect.width || rect.height)
					return {
						tag: el.tagName,
						id: el.id || null,
						class: el.className || null,
						visible
					}
				})
				expect(active).not.toBeNull()
				expect(active!.visible).toBeTruthy()
			}
		})

		test('share panel: axe scan and focus order', async ({ page }) => {
			await page.emulateMedia({ colorScheme })
			// Navigate with valid settings so the share panel can be opened
			await page.goto('/?operator=0&difficulty=1&showSettings=true')
			await page.waitForLoadState('networkidle')

			// Open share panel via the menu 'Del' button
			// Find the share toggle in the menu's action row to avoid clicking other 'Del' buttons
			const actionRow = page.locator('form .flex.justify-between')
			const shareToggle = actionRow
				.getByRole('button', { name: /^Del$/i })
				.first()
			await expect(shareToggle).toBeVisible()
			await shareToggle.click()
			// Wait for share panel to mount and become visible (animation complete)
			const sharePanel = page.locator('#share')
			await expect(sharePanel).toBeVisible()

			// Run Axe on the page (or panel)
			const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
			const criticalOrSeriousViolations =
				accessibilityScanResults.violations.filter((violation) =>
					['critical', 'serious'].includes(violation.impact ?? '')
				)
			expect(criticalOrSeriousViolations).toEqual([])

			// Focus order: title input should be focused first, then the share button
			// The SharePanel focuses the title input on mount; assert that
			const titleInput = sharePanel.locator('input[type="text"]')
			await expect(titleInput).toBeFocused()

			// Tab to the share button
			await page.keyboard.press('Tab')
			const shareButton = sharePanel
				.getByRole('button', { name: /^Del$/i })
				.first()
			await expect(shareButton).toBeFocused()
		})
	})
}
