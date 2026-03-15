import { test, expect } from '@playwright/test'
import { waitForApp } from './e2eHelpers'

test.describe('focus management in dialogs', () => {
	test('share dialog traps focus and restores it on close', async ({
		page
	}) => {
		await page.goto('/?operator=0&difficulty=1&showSettings=true')
		await waitForApp(page)

		const shareTrigger = page
			.getByTestId('menu-actions')
			.getByTestId('btn-share')
		await shareTrigger.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Initial focus should be on the title input
		const titleInput = dialog.locator('input[type="text"]')
		await expect(titleInput).toBeFocused()

		// Tab through all focusable elements — focus should stay within the dialog
		const focusableInDialog = dialog.locator(
			'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
		)
		const count = await focusableInDialog.count()
		expect(count).toBeGreaterThanOrEqual(2)

		// Tab past the last element — should wrap back inside the dialog
		for (let i = 0; i < count + 1; i++) {
			await page.keyboard.press('Tab')
		}

		const activeAfterWrap = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			return el?.closest('dialog') !== null
		})
		expect(
			activeAfterWrap,
			'focus should stay within dialog after Tab wrap'
		).toBe(true)

		// Shift+Tab should also stay within the dialog
		for (let i = 0; i < count + 1; i++) {
			await page.keyboard.press('Shift+Tab')
		}

		const activeAfterShiftWrap = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			return el?.closest('dialog') !== null
		})
		expect(
			activeAfterShiftWrap,
			'focus should stay within dialog after Shift+Tab wrap'
		).toBe(true)

		// Close with Escape — focus should return to the trigger button
		await page.keyboard.press('Escape')
		await expect(dialog).toBeHidden()
		await expect(shareTrigger).toBeFocused()
	})

	test('skill dialog traps focus and restores it on close', async ({
		page
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'regneflyt.adaptive-profiles.v1',
				JSON.stringify([50, 50, 50, 50])
			)
		})
		await page.goto('/')
		await waitForApp(page)

		// The skill button shows the overall % — click it
		const skillTrigger = page.getByRole('button', { name: /\d+%/ })
		await skillTrigger.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Tab through — focus should stay within the dialog
		const focusableInDialog = dialog.locator(
			'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
		)
		const count = await focusableInDialog.count()
		expect(count).toBeGreaterThanOrEqual(1)

		for (let i = 0; i < count + 1; i++) {
			await page.keyboard.press('Tab')
		}

		const activeInDialog = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			return el?.closest('dialog') !== null
		})
		expect(activeInDialog, 'focus should stay within skill dialog').toBe(true)

		// Close with Escape
		await page.keyboard.press('Escape')
		await expect(dialog).toBeHidden()
		await expect(skillTrigger).toBeFocused()
	})

	test('close button returns focus to trigger', async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem(
				'regneflyt.adaptive-profiles.v1',
				JSON.stringify([50, 50, 50, 50])
			)
		})
		await page.goto('/')
		await waitForApp(page)

		const skillTrigger = page.getByRole('button', { name: /\d+%/ })
		await skillTrigger.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Close via the X button
		await dialog.getByTestId('btn-dialog-close').click()
		await expect(dialog).toBeHidden()
		await expect(skillTrigger).toBeFocused()
	})
})
