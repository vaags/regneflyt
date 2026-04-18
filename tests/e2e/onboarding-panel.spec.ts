import { expect, test } from '@playwright/test'
import { ONBOARDING_COMPLETED_KEY, waitForApp } from './e2eHelpers'

test.describe('onboarding panel', () => {
	async function openFirstVisitMenu(page: import('@playwright/test').Page) {
		await page.goto('/')
		await page.evaluate(() => {
			window.localStorage.clear()
		})
		await page.reload()
		await waitForApp(page)
	}

	test('shows on first visit and moves focus to operator selection after dismissal', async ({
		page
	}) => {
		await openFirstVisitMenu(page)

		await expect(page.getByTestId('onboarding-panel')).toBeVisible()
		await page.getByTestId('btn-onboarding-dismiss').click()

		await expect(page.getByTestId('onboarding-panel')).toBeHidden()
		await expect(page.getByTestId('operator-0')).toBeFocused()
	})

	test('does not reappear after dismissal and reload', async ({ page }) => {
		await openFirstVisitMenu(page)

		await page.getByTestId('btn-onboarding-dismiss').click()
		await expect(page.getByTestId('onboarding-panel')).toBeHidden()

		await page.reload()
		await waitForApp(page)
		await expect(page.getByTestId('onboarding-panel')).toHaveCount(0)
		await expect
			.poll(() =>
				page.evaluate(
					(key) => window.localStorage.getItem(key),
					ONBOARDING_COMPLETED_KEY
				)
			)
			.toBe('true')
	})

	test('supports keyboard-only dismissal', async ({ page }) => {
		await openFirstVisitMenu(page)

		const dismissButton = page.getByTestId('btn-onboarding-dismiss')
		await dismissButton.focus()
		await page.keyboard.press('Enter')

		await expect(page.getByTestId('onboarding-panel')).toBeHidden()
		await expect(page.getByTestId('operator-0')).toBeFocused()
	})

	test('dev shortcut re-enables onboarding after dismissal', async ({
		page
	}) => {
		await openFirstVisitMenu(page)

		await page.getByTestId('btn-onboarding-dismiss').click()
		await expect(page.getByTestId('onboarding-panel')).toBeHidden()

		await page.keyboard.press('Meta+Shift+O')
		await expect(page.getByTestId('onboarding-panel')).toBeVisible()
	})
})
