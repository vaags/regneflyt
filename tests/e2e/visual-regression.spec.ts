import { test, expect, type Page } from '@playwright/test'

async function openSettingsWithColorScheme(
	page: Page,
	colorScheme: 'light' | 'dark'
) {
	await page.emulateMedia({ colorScheme })
	await page.goto('/settings')
	await page.waitForLoadState('networkidle')
}

/**
 * Visual regression tests using Playwright's built-in snapshot comparison.
 *
 * Tests static content pages that don't depend on randomized state.
 * Puzzle-based UI is excluded as it uses non-deterministic generation.
 *
 * Usage:
 * - First run (create baselines): npm run test:e2e:visual -- --update-snapshots
 * - Verify (daily): npm run test:e2e:visual
 * - Update after intentional changes: npm run test:e2e:visual -- --update-snapshots
 */

test.describe('Visual Regression', () => {
	test.describe('Results Page', () => {
		test.use({ viewport: { width: 375, height: 667 } })

		test('mobile - 75% score', async ({ page }) => {
			await page.goto('/results?score=75&total=100')
			await page.waitForLoadState('networkidle')
			await expect(page).toHaveScreenshot('results-mobile-75percent.png')
		})

		test.use({ viewport: { width: 1280, height: 720 } })
		test('desktop - 75% score', async ({ page }) => {
			await page.goto('/results?score=75&total=100')
			await page.waitForLoadState('networkidle')
			await expect(page).toHaveScreenshot('results-desktop-75percent.png')
		})
	})

	test.describe('Settings Page', () => {
		test.use({ viewport: { width: 375, height: 667 } })

		test('mobile - light theme', async ({ page }) => {
			await openSettingsWithColorScheme(page, 'light')
			await expect(page).toHaveScreenshot('settings-mobile-light.png')
		})

		test('mobile - dark theme', async ({ page }) => {
			await openSettingsWithColorScheme(page, 'dark')
			await expect(page).toHaveScreenshot('settings-mobile-dark.png')
		})

		test.use({ viewport: { width: 1280, height: 720 } })
		test('desktop - light theme', async ({ page }) => {
			await openSettingsWithColorScheme(page, 'light')
			await expect(page).toHaveScreenshot('settings-desktop-light.png')
		})

		test('desktop - dark theme', async ({ page }) => {
			await openSettingsWithColorScheme(page, 'dark')
			await expect(page).toHaveScreenshot('settings-desktop-dark.png')
		})
	})
})
