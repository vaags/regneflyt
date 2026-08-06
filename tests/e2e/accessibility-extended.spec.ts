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
	waitForPuzzle,
	waitForResults,
	waitForSettingsRouteHydration
} from './e2eHelpers'

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

			const menuScan = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()

			expect(menuScan.violations).toEqual([])

			// Try to start a quiz if a Start button exists and run Axe again on the quiz screen
			const startButtons = await page.getByTestId('btn-start').count()
			expect(startButtons).toBeGreaterThan(0)
			const startButton = page.getByTestId('btn-start')
			await startButton.click()
			await expect(startButton).toBeHidden()
			await waitForPuzzle(page)

			const quizScan = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()

			expect(quizScan.violations).toEqual([])
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
			await waitForResults(page)

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
			await waitForResults(page)
			await expect(page.getByTestId('heading-results-skill')).toBeVisible()

			const { violations } = await new AxeBuilder({ page })
				.include('[data-testid="heading-results"]')
				.include('[data-testid="heading-results-skill"]')
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})

		test('settings screen has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await page.goto('/settings')
			await waitForSettingsRouteHydration(page)

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})

		test('open dialog has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			await page.goto('/?duration=0')
			await waitForApp(page)
			await startQuiz(page)
			await waitForPuzzle(page)

			// Open the complete-quiz confirmation dialog
			await page.getByTestId('btn-complete-quiz').click()
			await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
				timeout: 10_000
			})

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})

		test('an invalid number range has no WCAG AAA accessibility violations', async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme })
			// The only menu validation error reachable from the UI. The missing-operator
			// error cannot be provoked, because initQuizFromUrl defaults
			// selectedOperator to Addition; it is covered by a component test instead.
			await openConfiguredMenu(
				page,
				'operator=0&difficulty=0&addMin=5&addMax=5&subMin=1&subMax=10'
			)
			await expect(page.locator('#partOneMin-0')).toHaveAttribute(
				'aria-invalid',
				'true'
			)

			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
				.analyze()
			expect(violations).toEqual([])
		})
	})
}
