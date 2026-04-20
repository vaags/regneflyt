import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
	ADAPTIVE_PROFILES_KEY,
	openConfiguredMenu,
	readPuzzle,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForPuzzle
} from './e2eHelpers'
import { hasVisibleActiveElement } from '../helpers/a11yInvariants'

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
			await page.addInitScript((key) => {
				localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
			}, ADAPTIVE_PROFILES_KEY)
			// Navigate with query params so preview controls are rendered
			await openConfiguredMenu(page)

			let { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()

			expect(violations).toEqual([])

			// Try to start a quiz if a Start button exists and run Axe again on the quiz screen
			const startButtons = await page.getByTestId('btn-start').count()
			expect(startButtons).toBeGreaterThan(0)
			const startButton = page.getByTestId('btn-start')
			await startButton.click()
			await expect(startButton).toBeHidden()
			;({ violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze())

			expect(violations).toEqual([])
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
					const visible = Boolean(rect.width || rect.height)
					return {
						tag: el.tagName,
						id: el.id || null,
						class: el.className || null,
						visible
					}
				})
				expect(active).not.toBeNull()
				expect(hasVisibleActiveElement({ visible: active?.visible })).toBe(true)
			}
		})

		test('copy link split button: axe scan and focus order', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			// Navigate with valid settings so preview controls are rendered
			await openConfiguredMenu(page, 'operator=0&difficulty=0')

			const copyButton = page.getByTestId('btn-copy-link')
			const copyToggle = page.getByTestId('btn-copy-link-toggle')
			await expect(copyButton).toBeVisible()
			await expect(copyToggle).toBeVisible()

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])

			await copyButton.focus()
			await expect(copyButton).toBeFocused()
			await page.keyboard.press('Tab')
			await expect(copyToggle).toBeFocused()
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
			await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
				timeout: 10_000
			})
			await page.getByTestId('btn-complete-yes').click()
			await expect(page.getByTestId('heading-results')).toBeVisible({
				timeout: 10_000
			})

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})

		test('results skill overview has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await page.addInitScript((key) => {
				localStorage.setItem(key, JSON.stringify([80, 60, 40, 20]))
			}, ADAPTIVE_PROFILES_KEY)
			await page.goto('/results')
			await expect(page.getByTestId('heading-results')).toBeVisible()
			await expect(page.getByTestId('heading-results-skill')).toBeVisible()

			const { violations } = await new AxeBuilder({ page })
				.include('[data-testid="heading-results"]')
				.include('[data-testid="heading-results-skill"]')
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})
	})
}
