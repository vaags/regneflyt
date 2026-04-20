import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'

/**
 * Complete a quiz by solving one puzzle and clicking the complete button.
 */
async function completeQuiz(page: Page) {
	await page.goto('/?duration=0')
	await waitForApp(page)
	await startQuiz(page)
	await waitForPuzzle(page)

	// Solve the first puzzle correctly
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
}

test('correct answer shows checkmark and skill section on results', async ({
	page
}) => {
	await completeQuiz(page)

	// At least one correct answer should show a checkmark
	await expect(page.getByTestId('icon-correct').first()).toBeVisible()

	// Percentage should be displayed
	await expect(page.getByTestId('results-summary-percentage')).toBeVisible()

	// Skill and puzzle sections should be visible
	await expect(page.getByTestId('heading-results-skill')).toBeVisible()
	await expect(page.getByTestId('heading-puzzles')).toBeVisible()
})

test('can start another quiz from results screen', async ({ page }) => {
	await completeQuiz(page)

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page, 7_000)
})

test('can navigate back to menu from results screen', async ({ page }) => {
	await completeQuiz(page)

	await page.getByTestId('btn-menu').click()
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
})

test('can view last results from menu after completing a quiz', async ({
	page
}) => {
	await completeQuiz(page)

	await page.getByTestId('btn-menu').click()
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()

	await page.getByTestId('btn-results').click()
	await expect(page.getByTestId('heading-results')).toBeVisible()
	await expect(page.getByTestId('icon-correct').first()).toBeVisible()
})

test('skill bar animation is enabled only after automatic post-quiz navigation', async ({
	page
}) => {
	await completeQuiz(page)

	// The addition bar (operator 0) is always played in the default quiz setup
	const autoSkillFill = page
		.getByTestId('skill-overall-operator-0')
		.getByRole('progressbar')
		.locator('div')
		.first()
	await expect(autoSkillFill).toHaveClass(/skill-bar-fill-animated/)

	await page.getByTestId('btn-menu').click()
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
	await page.getByTestId('btn-results').click()
	await expect(page.getByTestId('heading-results')).toBeVisible()

	const manualSkillFill = page
		.getByTestId('skill-overall-operator-0')
		.getByRole('progressbar')
		.locator('div')
		.first()
	await expect(manualSkillFill).not.toHaveClass(/skill-bar-fill-animated/)
})

test('wrong answer shows cross icon and no checkmarks in results', async ({
	page
}) => {
	await page.goto('/?duration=0')
	await waitForApp(page)
	await startQuiz(page)
	await waitForPuzzle(page)

	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	const puzzleNumber = await readPuzzleNumber(page)
	await submitAnswer(page, correctAnswer + 1)
	await waitForNextPuzzle(page, puzzleNumber)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
		timeout: 5_000
	})
	await page.getByTestId('btn-complete-yes').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 5_000
	})

	// Wrong answer markers
	await expect(page.getByTestId('icon-incorrect')).toBeVisible()
	await expect(page.getByTestId('icon-correct')).not.toBeVisible()

	// Correct percentage should be 0 (no correct answers)
	await expect(page.getByTestId('results-summary-percentage')).toHaveText(
		/^0\s*%/
	)
})

test('quiz adaptiveSkillByOperator persists through reload', async ({
	page
}) => {
	// Complete a quiz
	await completeQuiz(page)

	// Wait for animations and skill calculations to complete by waiting for the delta display
	await expect(page.getByTestId('results-skill-bars')).toBeVisible()

	// Reload the page (should restore results from localStorage)
	await page.reload()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	// The results page should still be visible with skill bars after reload
	// This ensures adaptiveSkillByOperator was properly persisted and rehydrated
	await expect(page.getByTestId('heading-results-skill')).toBeVisible()
	// Verify skill bars are rendered
	await expect(page.getByTestId('skill-overall-operator-0')).toBeVisible()
	await expect(page.getByTestId('skill-overall-operator-1')).toBeVisible()
	await expect(page.getByTestId('skill-overall-operator-2')).toBeVisible()
	await expect(page.getByTestId('skill-overall-operator-3')).toBeVisible()

	// Verify results summary is also visible (full reload validation)
	await expect(page.getByTestId('results-summary-card')).toBeVisible()
})
