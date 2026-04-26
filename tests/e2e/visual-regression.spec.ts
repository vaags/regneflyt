import { test, expect, type Page } from '@playwright/test'
import { STORAGE_KEY_PREFIX } from './e2eHelpers'

const LAST_RESULTS_KEY = `${STORAGE_KEY_PREFIX}regneflyt.last-results.v1`

const SEEDED_RESULTS_SNAPSHOT = {
	puzzleSet: [
		{
			parts: [
				{ generatedValue: 4, userDefinedValue: 4 },
				{ generatedValue: 5, userDefinedValue: 5 },
				{ generatedValue: 9, userDefinedValue: 9 }
			],
			duration: 1.2,
			isCorrect: true,
			operator: 0,
			unknownPartIndex: 2,
			puzzleMode: 0
		},
		{
			parts: [
				{ generatedValue: 8, userDefinedValue: 8 },
				{ generatedValue: 3, userDefinedValue: 3 },
				{ generatedValue: 5, userDefinedValue: 5 }
			],
			duration: 1.5,
			isCorrect: true,
			operator: 1,
			unknownPartIndex: 2,
			puzzleMode: 0
		},
		{
			parts: [
				{ generatedValue: 7, userDefinedValue: 7 },
				{ generatedValue: 6, userDefinedValue: 6 },
				{ generatedValue: 42, userDefinedValue: 42 }
			],
			duration: 2.1,
			isCorrect: true,
			operator: 2,
			unknownPartIndex: 2,
			puzzleMode: 0
		},
		{
			parts: [
				{ generatedValue: 24, userDefinedValue: 24 },
				{ generatedValue: 6, userDefinedValue: 5 },
				{ generatedValue: 4, userDefinedValue: 4 }
			],
			duration: 2.8,
			isCorrect: false,
			operator: 3,
			unknownPartIndex: 1,
			puzzleMode: 1
		}
	],
	quizStats: {
		correctAnswerCount: 3,
		correctAnswerPercentage: 75,
		starCount: 2
	},
	quiz: {
		seed: 12345,
		duration: 0.5,
		showPuzzleProgressBar: true,
		allowNegativeAnswers: false,
		adaptiveSkillByOperator: [45, 40, 35, 30],
		puzzleMode: 0,
		selectedOperator: 0,
		difficulty: 1,
		operatorSettings: [
			{ range: [1, 20], possibleValues: [] },
			{ range: [1, 20], possibleValues: [] },
			{ range: [1, 10], possibleValues: [2, 3, 4, 5, 6] },
			{ range: [1, 10], possibleValues: [2, 3, 4, 5, 6] }
		]
	},
	preQuizSkill: [40, 35, 30, 25]
}

async function seedResultsSnapshot(page: Page): Promise<void> {
	await page.addInitScript(
		({ key, value }) => {
			window.localStorage.setItem(key, JSON.stringify(value))
		},
		{ key: LAST_RESULTS_KEY, value: SEEDED_RESULTS_SNAPSHOT }
	)
}

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
	test.use({ locale: 'nb-NO' })

	test.describe('Results Page', () => {
		test.use({ viewport: { width: 375, height: 667 } })

		test('mobile - 75% score', async ({ page }) => {
			await seedResultsSnapshot(page)
			await page.goto('/results?score=75&total=100')
			await page.waitForLoadState('networkidle')
			await expect(page).toHaveScreenshot('results-mobile-75percent.png')
		})

		test.use({ viewport: { width: 1280, height: 720 } })
		test('desktop - 75% score', async ({ page }) => {
			await seedResultsSnapshot(page)
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
