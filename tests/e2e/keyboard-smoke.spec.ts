import { expect, test } from '@playwright/test'
import {
	pressTabIntoDocument,
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'

test.describe('cross-browser keyboard smoke', () => {
	test('native Tab reveals and focuses the skip link', async ({
		page,
		browserName
	}) => {
		await page.goto('/')
		await waitForApp(page)

		const tabEnteredDocument = await pressTabIntoDocument(page, browserName)
		// eslint-disable-next-line playwright/no-skipped-test -- macOS host keyboard settings can prevent non-Chromium Tab from entering document focus; this native-Tab assertion must not fall back to programmatic focus
		test.skip(
			!tabEnteredDocument,
			`${browserName} host keyboard settings did not allow Tab to enter the document`
		)

		const skipLink = page.locator('a[href="#main-content"]')
		await expect(skipLink).toBeFocused()
		await expect(skipLink).toBeVisible()
	})

	test('Enter on Start launches the configured quiz', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)
		await page.getByTestId('operator-0').check()
		await page.getByTestId('difficulty-1').check()

		const startButton = page.getByTestId('btn-start')
		await startButton.focus()
		await page.keyboard.press('Enter')

		await waitForPuzzle(page)
	})

	test('quiz focus supports answer entry and Enter submission', async ({
		page
	}) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })
		const initialPuzzleNumber = await readPuzzleNumber(page)
		const puzzle = await readPuzzle(page)
		const answer = page.getByTestId('puzzle-answer-value')

		await expect(answer).toBeFocused()
		await page.keyboard.type(solvePuzzle(puzzle).toString())
		await page.keyboard.press('Enter')

		await waitForNextPuzzle(page, initialPuzzleNumber)
		const resultsButton = page.getByTestId('btn-results')
		await resultsButton.focus()
		await expect(resultsButton).toBeFocused()
	})

	test('completion dialog focuses safely and restores its trigger', async ({
		page
	}) => {
		await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })
		await expect(page.getByTestId('puzzle-answer-value')).toBeFocused()
		const completeButton = page.getByTestId('btn-complete-quiz')

		await completeButton.focus()
		await expect(completeButton).toBeFocused()
		await completeButton.press('Enter')
		const openDialog = page.locator('dialog[open]')
		await expect(
			openDialog.getByTestId('complete-dialog-heading')
		).toBeVisible()
		await expect(openDialog.getByTestId('btn-dialog-close')).toBeFocused()

		await page.keyboard.press('Escape')
		await expect(openDialog).toBeHidden()
		await expect(completeButton).toBeFocused()
	})
})
