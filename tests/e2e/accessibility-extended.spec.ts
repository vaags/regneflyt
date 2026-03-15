import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import {
	readPuzzle,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForPuzzle
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
					'regneflyt.adaptive-profiles.v1',
					JSON.stringify([50, 50, 50, 50])
				)
			})
			// Navigate with query params so share panel can be opened (valid settings)
			await page.goto('/?operator=0&difficulty=1&showSettings=true')
			await waitForApp(page)

			let { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()

			expect(violations).toEqual([])

			// Try to start a quiz if a Start button exists and run Axe again on the quiz screen
			const startButtons = await page.getByTestId('btn-start').count()
			if (startButtons > 0) {
				const startButton = page.getByTestId('btn-start')
				await startButton.click()
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
			await waitForApp(page)

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
			await waitForApp(page)

			// Open share dialog via the menu 'Del' button
			const actionRow = page.getByTestId('menu-actions')
			const shareToggle = actionRow.getByTestId('btn-share')
			await expect(shareToggle).toBeVisible()
			await shareToggle.click()
			// Wait for share dialog to appear
			const shareDialog = page.getByRole('dialog')
			await expect(shareDialog).toBeVisible()

			// Run Axe scoped to dialog; disable color-contrast rules because axe-core
			// cannot model the ::backdrop pseudo-element as a background layer,
			// causing false-positive contrast failures.
			const { violations } = await new AxeBuilder({ page })
				.include('dialog[open]')
				.disableRules(['color-contrast', 'color-contrast-enhanced'])
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])

			// Focus order: title input should be focused first, then the share button
			const titleInput = shareDialog.locator('input[type="text"]')
			await expect(titleInput).toBeFocused()

			// Tab to the share button
			await page.keyboard.press('Tab')
			const shareButton = shareDialog.getByTestId('btn-share')
			await expect(shareButton).toBeFocused()
		})

		test('results screen has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await page.goto('/?duration=0')
			await waitForApp(page)
			await startQuiz(page)
			await waitForPuzzle(page)

			const puzzle = await readPuzzle(page)
			await submitAnswer(page, solvePuzzle(puzzle))
			await waitForPuzzle(page)

			await page.getByTestId('btn-complete-quiz').click()
			await expect(page.getByTestId('heading-results')).toBeVisible({
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
			await waitForApp(page)

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
