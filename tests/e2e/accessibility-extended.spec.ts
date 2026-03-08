import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer
} from './e2eHelpers'

type ActiveInfo = {
	tag: string
	id: string | null
	class: string | null
	visible: boolean
}

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`a11y extended (${colorScheme})`, () => {
		test(`menu and quiz screens have no WCAG AAA accessibility violations`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			// Seed adaptive skills so the skill-percentage button renders
			await page.addInitScript(() => {
				localStorage.setItem(
					'dev.regneflyt.adaptive-profiles.v1',
					JSON.stringify([50, 50, 50, 50])
				)
			})
			// Navigate with query params so share panel can be opened (valid settings)
			await page.goto('/?operator=0&difficulty=1&showSettings=true')
			await page.waitForLoadState('networkidle')
			await expect(
				page.getByRole('heading', { name: 'Velg regneart' })
			).toBeVisible()

			let { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()

			expect(violations).toEqual([])

			// Try to start a quiz if a Start button exists and run Axe again on the quiz screen
			const startButtons = await page
				.getByRole('button', { name: /Start/i })
				.count()
			if (startButtons > 0) {
				const startButton = page.getByRole('button', { name: /Start/i }).first()
				await startButton.click()
				await page.waitForLoadState('networkidle')
				await expect(startButton).toBeHidden()
				;({ violations } = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
					.analyze())

				expect(violations).toEqual([])
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

		test('share dialog: axe scan and focus order', async ({ page }) => {
			await page.emulateMedia({ colorScheme })
			// Navigate with valid settings so the share dialog can be opened
			await page.goto('/?operator=0&difficulty=1&showSettings=true')
			await page.waitForLoadState('networkidle')

			// Open share dialog via the menu 'Del' button
			const actionRow = page.getByTestId('menu-actions')
			const shareToggle = actionRow
				.getByRole('button', { name: /^Del$/i })
				.first()
			await expect(shareToggle).toBeVisible()
			await shareToggle.click()
			// Wait for share dialog to appear
			const shareDialog = page.locator('dialog')
			await expect(shareDialog).toBeVisible()

			// Run Axe on the page
			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])

			// Focus order: title input should be focused first, then the share button
			const titleInput = shareDialog.locator('input[type="text"]')
			await expect(titleInput).toBeFocused()

			// Tab to the share button
			await page.keyboard.press('Tab')
			const shareButton = shareDialog
				.getByRole('button', { name: /^Del$/i })
				.first()
			await expect(shareButton).toBeFocused()
		})

		test('results screen has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await installFastTimers(page, 2000)
			await page.goto('/?duration=0.5')
			await page.getByRole('radio', { name: 'Addisjon' }).check()
			await page.getByRole('radio', { name: 'Automatisk' }).check()

			await page.getByRole('button', { name: 'Start' }).click()
			await expect(page.getByText('Oppgave 1')).toBeVisible({
				timeout: 5_000
			})

			const puzzle = await readPuzzle(page)
			await submitAnswer(page, solvePuzzle(puzzle))

			await expect(page.getByText('Resultater')).toBeVisible({
				timeout: 10_000
			})

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})

		test('skill dialog has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await page.addInitScript(() => {
				localStorage.setItem(
					'regneflyt.adaptive-profiles.v1',
					JSON.stringify([80, 60, 40, 20])
				)
			})
			await page.goto('/')
			await page.waitForLoadState('networkidle')

			await page.getByRole('button', { name: /\d+%/ }).click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Scope to dialog; disable color-contrast rules because axe-core
			// cannot model the ::backdrop pseudo-element as a background layer,
			// causing false-positive contrast failures (it composites text
			// through the semi-transparent backdrop to the page behind).
			const { violations } = await new AxeBuilder({ page })
				.include('dialog[open]')
				.disableRules(['color-contrast', 'color-contrast-enhanced'])
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})
	})
}
