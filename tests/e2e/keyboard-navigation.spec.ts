import { expect, test, type Page } from '@playwright/test'
import type { Locale } from '../../src/lib/paraglide/runtime.js'
import {
	toast_copy_link_deterministic_success,
	toast_copy_link_error,
	toast_copy_link_success,
	toast_copy_link_validation_error,
	toast_validation_error
} from '../../src/lib/paraglide/messages.js'
import {
	msg,
	openConfiguredMenu,
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle,
	waitForResults,
	waitForSettingsRouteHydration
} from './e2eHelpers'

const TOAST_TEST_LOCALE: Locale = 'nb'

async function reachResults(page: Page) {
	await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })
	const puzzle = await readPuzzle(page)
	await submitAnswer(page, solvePuzzle(puzzle))
	await waitForPuzzle(page)
	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
		timeout: 10_000
	})
	await page.getByTestId('btn-complete-yes').click()
	await waitForResults(page)
}

async function pressTabIntoDocument(
	page: Page,
	browserName: string
): Promise<boolean> {
	let activeTag = 'BODY'
	for (let attempt = 0; attempt < 3; attempt++) {
		await page.keyboard.press('Tab')
		activeTag = await page.evaluate(() => {
			const el = document.activeElement
			return el ? el.tagName : 'BODY'
		})
		if (activeTag !== 'BODY') return true
	}

	if (browserName === 'chromium') {
		throw new Error('Tab navigation stayed on BODY after 3 attempts')
	}

	return false
}

type ClipboardStubMode = 'success' | 'error' | 'tracking'

async function stubClipboardWriteText(
	page: Page,
	mode: ClipboardStubMode = 'success'
) {
	await page.addInitScript((stubMode: ClipboardStubMode) => {
		const tracker = window as Window & { __clipboardWriteCalls?: number }
		if (stubMode === 'tracking') {
			tracker.__clipboardWriteCalls = 0
		}

		const clipboardStub = {
			writeText: () => {
				if (stubMode === 'error') {
					throw new Error('Clipboard write failed')
				}

				if (stubMode === 'tracking') {
					tracker.__clipboardWriteCalls =
						(tracker.__clipboardWriteCalls ?? 0) + 1
				}

				return Promise.resolve(undefined)
			}
		}

		try {
			Object.defineProperty(Navigator.prototype, 'clipboard', {
				configurable: true,
				get: () => clipboardStub
			})
		} catch {
			// If clipboard cannot be redefined in this browser context,
			// tests fall back to native clipboard behavior.
		}
	}, mode)
}

test.describe('keyboard navigation', () => {
	test('skip-to-content link becomes visible on first Tab', async ({
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
		// The skip link uses sr-only + focus:not-sr-only — it should be visible when focused
		await expect(skipLink).toBeVisible()
	})

	test('tab through menu selects all interactive controls', async ({
		page,
		browserName
	}) => {
		await page.goto('/')
		await waitForApp(page)

		const focusedElements: string[] = []
		// Tab through menu elements — collect tag names of focused elements
		for (let i = 0; i < 20; i++) {
			const tabEnteredDocument = await pressTabIntoDocument(page, browserName)
			// eslint-disable-next-line playwright/no-skipped-test -- macOS host keyboard settings can prevent non-Chromium Tab from entering document focus; this native-Tab assertion must not fall back to programmatic focus
			test.skip(
				!tabEnteredDocument,
				`${browserName} host keyboard settings did not allow Tab to enter the document`
			)
			const tag = await page.evaluate(() => {
				const el = document.activeElement
				if (!el || el === document.body) return 'BODY'
				return el.tagName
			})
			focusedElements.push(tag)
		}
		const nonBodyElements = focusedElements.filter((tag) => tag !== 'BODY')

		// Should have focused buttons, inputs, and radio/select elements
		expect(nonBodyElements.length).toBeGreaterThan(0)
		expect(nonBodyElements).toContain('BUTTON')
		expect(nonBodyElements.some((t) => t === 'INPUT' || t === 'SELECT')).toBe(
			true
		)
	})

	test('operator radio buttons navigable with arrow keys', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)

		// Ensure the first radio is active, then use arrow keys on the control
		const additionRadio = page.getByTestId('operator-0')
		await additionRadio.check()
		await expect(additionRadio).toBeChecked()
		await additionRadio.focus()
		await expect(additionRadio).toBeFocused()

		// ArrowDown should move to next radio in the same group
		await additionRadio.press('ArrowDown')
		const subtractionRadio = page.getByTestId('operator-1')
		await expect(subtractionRadio).toBeChecked()

		await subtractionRadio.press('ArrowDown')
		const multiplicationRadio = page.getByTestId('operator-2')
		await expect(multiplicationRadio).toBeChecked()
	})

	test('start quiz with Enter key on Start button', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)

		// Select an operator
		await page.getByTestId('operator-0').check()
		await page.getByTestId('difficulty-1').check()

		// Focus and press Enter on Start button
		const startButton = page.getByTestId('btn-start')
		await startButton.focus()
		await page.keyboard.press('Enter')

		// Should enter quiz mode
		await waitForPuzzle(page)
	})

	test('start quiz with Space key on Start button', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('operator-0').check()
		await page.getByTestId('difficulty-1').check()

		const startButton = page.getByTestId('btn-start')
		await startButton.focus()
		await page.keyboard.press('Space')

		await waitForPuzzle(page)
	})

	test('type answer and submit with Enter during quiz', async ({ page }) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		const puzzle = await readPuzzle(page)
		await page.keyboard.type(solvePuzzle(puzzle).toString())
		await page.keyboard.press('Enter')

		// Should advance to puzzle 2
		await expect(page.getByTestId('puzzle-heading')).toContainText(/\d/)
	})

	test('focuses the answer field when the quiz starts', async ({ page }) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toBeFocused()
		await page.keyboard.press('5')
		await expect(answer).toHaveValue('5')
	})

	test('focuses the answer field when alternate mode moves it within the equation', async ({
		page
	}) => {
		await startQuiz(page, {
			url: '/?puzzleMode=1',
			waitForPuzzle: true
		})

		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toBeFocused()
		await page.keyboard.press('5')
		await expect(answer).toHaveValue('5')
	})

	test('an incorrect answer does not leak into the next puzzle input', async ({
		page
	}) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })
		const initialPuzzleNumber = await readPuzzleNumber(page)

		await page.keyboard.type('999')
		await page.keyboard.press('Enter')
		await waitForNextPuzzle(page, initialPuzzleNumber)
		await expect(page.getByTestId('puzzle-answer-value')).toBeFocused()
		await page.keyboard.press('5')

		await expect(page.getByTestId('puzzle-answer-value')).toHaveValue('5')
	})

	test('number keys do not enter an answer after the answer field loses focus', async ({
		page
	}) => {
		await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })

		const answer = page.getByTestId('puzzle-answer-value')
		await page.getByTestId('btn-menu').focus()
		await page.keyboard.press('5')
		await expect(answer).toHaveValue('')

		await page.getByTestId('numpad-5').click()
		await expect(answer).toHaveValue('5')
		// WebKit does not focus buttons on pointer activation by default. The
		// cross-browser invariant is that the keypad must not pull focus back to
		// the answer field after the user deliberately left it.
		await expect(answer).not.toBeFocused()
	})

	test('backspace clears digit during quiz', async ({ page }) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		// Type a digit, then backspace
		await page.keyboard.type('9')
		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toHaveValue('9')

		await page.keyboard.press('Backspace')
		await expect(answer).toHaveValue('')
	})

	test('repeated submit with missing input does not advance puzzle', async ({
		page
	}) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		const initialPuzzleNumber = await readPuzzleNumber(page)

		// Empty submit exposes a persistent toast and describes the numpad group
		// through a non-live descriptor, so the error is announced only once.
		await page.keyboard.press('Enter')
		const validationMessage = page.getByTestId('puzzle-answer-validation')
		await expect(validationMessage).toHaveText(/.+/)
		await expect(validationMessage).not.toHaveAttribute('aria-live')
		await expect(validationMessage).not.toHaveAttribute('role')
		const validationToast = page.getByTestId('puzzle-answer-validation-toast')
		await expect(validationToast).toBeVisible()
		await expect(validationToast.getByRole('alert')).toBeVisible()
		const numpadGroup = page.getByRole('group', {
			name: /tall|number|pavé|ziffer|teclado/i
		})
		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toHaveAttribute('aria-invalid', 'true')
		await expect(answer).toHaveAttribute(
			'aria-describedby',
			'puzzle-answer-validation'
		)
		await expect(numpadGroup).toHaveAttribute(
			'aria-describedby',
			'puzzle-answer-validation'
		)

		// Enter maps to the same complete action and must remain a no-op here.
		await page.keyboard.press('Enter')
		await expect
			.poll(async () => readPuzzleNumber(page), {
				timeout: 1_500,
				intervals: [150, 300, 600]
			})
			.toBe(initialPuzzleNumber)
		await expect(validationToast).toBeVisible()

		await page.keyboard.press('5')
		await expect(validationToast).toBeHidden()
		await expect(answer).not.toHaveAttribute('aria-invalid')
		await expect(answer).not.toHaveAttribute('aria-describedby')
		await expect(numpadGroup).not.toHaveAttribute('aria-describedby')
	})

	test('character keys stop controlling the quiz after focus moves to persistent navigation', async ({
		page
	}) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toHaveValue('')
		await page.getByTestId('btn-menu').focus()
		await page.keyboard.press('5')

		await expect(answer).toHaveValue('')
	})

	test('cancel flow aborts quiz via keyboard', async ({ page }) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		await page.getByTestId('btn-cancel').click()
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible()
		await page.getByTestId('btn-cancel-yes').click()

		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
	})

	test('complete unlimited quiz with keyboard', async ({ page }) => {
		await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })

		// Solve a few puzzles
		for (let i = 0; i < 3; i++) {
			const puzzle = await readPuzzle(page)
			await submitAnswer(page, solvePuzzle(puzzle))
			await expect(page.getByTestId('puzzle-heading')).toContainText(/\d/)
		}

		// Focus complete button and activate with Enter
		const completeButton = page.getByTestId('btn-complete-quiz')
		await completeButton.focus()
		await page.keyboard.press('Enter')
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
			timeout: 5_000
		})
		await page.getByTestId('btn-complete-yes').click()

		// Should show results
		await waitForResults(page)
	})

	test('double-clicking complete confirm still finishes quiz once', async ({
		page
	}) => {
		await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })

		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))
		await waitForPuzzle(page)

		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
			timeout: 5_000
		})

		await page.getByTestId('btn-complete-yes').dblclick()

		await waitForResults(page)
		await expect(page).toHaveURL(/\/results(?:\?|$)/)
	})

	test('results screen navigable with Tab and Enter', async ({ page }) => {
		await reachResults(page)

		// Tab to Start button on results screen and press Enter
		const startButton = page.getByTestId('btn-start')
		await startButton.focus()
		await page.keyboard.press('Enter')

		// Should start a new quiz
		await waitForPuzzle(page, 7_000)
	})

	test('results screen Menu button navigable with keyboard', async ({
		page
	}) => {
		await reachResults(page)

		// Focus and activate Menu button
		const menuButton = page.getByTestId('btn-menu')
		await menuButton.focus()
		await page.keyboard.press('Enter')

		await expect(page.getByTestId('heading-select-operator')).toBeVisible()
	})

	test('settings screen Menu button navigable with keyboard', async ({
		page
	}) => {
		await page.goto('/?duration=0&operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await waitForSettingsRouteHydration(page)

		const menuButton = page.getByTestId('btn-menu')
		await menuButton.focus()
		await page.keyboard.press('Enter')

		await expect(page.getByTestId('heading-select-operator')).toBeVisible()
	})

	test('settings screen Start button navigable with keyboard', async ({
		page
	}) => {
		await page.goto('/?duration=0&operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await waitForSettingsRouteHydration(page)

		const startButton = page.getByTestId('btn-start')
		await startButton.focus()
		await page.keyboard.press('Enter')

		await waitForPuzzle(page)
	})

	test('results button routes to results with keyboard', async ({ page }) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const resultsButton = page.getByTestId('btn-results')
		await resultsButton.focus()
		await page.keyboard.press('Enter')
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible()
		await page.getByTestId('btn-cancel-yes').click()
		await waitForResults(page)
		await expect(page.getByTestId('heading-results-skill')).toBeVisible()
	})

	test('copy link split button opens and closes with keyboard', async ({
		page
	}) => {
		await openConfiguredMenu(page, 'operator=0&difficulty=0')

		const copyButton = page.getByTestId('btn-copy-link')
		const copyToggle = page.getByTestId('btn-copy-link-toggle')

		await copyButton.focus()
		await expect(copyButton).toBeFocused()

		await page.keyboard.press('Tab')
		await expect(copyToggle).toBeFocused()

		await page.keyboard.press('Enter')
		const secondaryAction = page.getByTestId('btn-copy-link-secondary')
		await expect(secondaryAction).toBeVisible()
		await expect(secondaryAction).toBeFocused()

		// Escape should close split menu and restore focus to toggle
		await page.keyboard.press('Escape')
		await expect(secondaryAction).not.toBeVisible()
		await expect(copyToggle).toBeFocused()
	})

	test('copy link split menu stays within the viewport on narrow screens', async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 740 })
		await openConfiguredMenu(page, 'operator=0&difficulty=0')

		await page.getByTestId('btn-copy-link-toggle').click()
		const secondaryAction = page.getByTestId('btn-copy-link-secondary')
		await expect(secondaryAction).toBeVisible()

		const rect = await secondaryAction.evaluate((element) => {
			const { left, right } = element.getBoundingClientRect()
			return {
				left,
				right,
				viewportWidth: window.innerWidth
			}
		})

		expect(rect.left).toBeGreaterThanOrEqual(0)
		expect(rect.right).toBeLessThanOrEqual(rect.viewportWidth)
	})

	test('copy actions announce toast content for both link variants', async ({
		page
	}) => {
		await page.addInitScript((locale) => {
			document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/`
		}, TOAST_TEST_LOCALE)
		await stubClipboardWriteText(page)
		await openConfiguredMenu(page, 'operator=0&difficulty=0')
		const expectedPrimaryToast = msg(toast_copy_link_success, TOAST_TEST_LOCALE)
		const expectedSecondaryToast = msg(
			toast_copy_link_deterministic_success,
			TOAST_TEST_LOCALE
		)

		const successToastMessage = page.getByTestId('toast-message')
		const politeAnnouncer = page.getByTestId('toast-live-region')

		await page.getByTestId('btn-copy-link').click()
		await expect(successToastMessage).toBeVisible()
		await expect(successToastMessage).toHaveText(expectedPrimaryToast)
		await expect(politeAnnouncer).toHaveText(expectedPrimaryToast)

		await page.getByTestId('btn-copy-link-toggle').click()
		await page.getByTestId('btn-copy-link-secondary').click()
		await expect(successToastMessage).toBeVisible()
		await expect(successToastMessage).toHaveText(expectedSecondaryToast)
		await expect(politeAnnouncer).toHaveText(expectedSecondaryToast)
		expect(expectedSecondaryToast).not.toBe(expectedPrimaryToast)
	})

	test('error toast auto-dismisses after a longer delay', async ({ page }) => {
		await page.addInitScript((locale) => {
			document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/`
		}, TOAST_TEST_LOCALE)
		await stubClipboardWriteText(page, 'error')
		await openConfiguredMenu(page)
		const expectedErrorToast = msg(toast_copy_link_error, TOAST_TEST_LOCALE)

		await page.getByTestId('btn-copy-link').click()
		const errorToast = page.getByRole('alert')
		const errorToastMessage = page.getByTestId('toast-message')
		await expect(errorToast).toBeVisible()
		await expect(errorToastMessage).toHaveText(expectedErrorToast)
		// Errors interrupt on their own, so they must not also reach the polite region.
		await expect(page.getByTestId('toast-live-region')).toBeEmpty()

		await expect(errorToast).toBeVisible({ timeout: 4_500 })
		await errorToast.waitFor({ state: 'detached', timeout: 8_500 })
	})

	test('copy shows dedicated validation error toast and blocks clipboard writes when menu settings are invalid', async ({
		page
	}) => {
		await page.addInitScript((locale) => {
			document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/`
		}, TOAST_TEST_LOCALE)
		await stubClipboardWriteText(page, 'tracking')
		await openConfiguredMenu(
			page,
			'operator=0&difficulty=0&addMin=5&addMax=5&subMin=1&subMax=10'
		)

		const expectedValidationToast = msg(
			toast_copy_link_validation_error,
			TOAST_TEST_LOCALE
		)

		await page.getByTestId('btn-copy-link').click()

		const validationToast = page
			.getByRole('alert')
			.filter({ hasText: expectedValidationToast })
		await expect(validationToast).toBeVisible()

		const clipboardWriteCalls = await page.evaluate(
			() =>
				(window as Window & { __clipboardWriteCalls?: number })
					.__clipboardWriteCalls ?? 0
		)
		expect(clipboardWriteCalls).toBe(0)
	})

	test('start shows validation error toast when menu settings are invalid', async ({
		page
	}) => {
		await page.addInitScript((locale) => {
			document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/`
		}, TOAST_TEST_LOCALE)
		await openConfiguredMenu(
			page,
			'operator=0&difficulty=0&addMin=5&addMax=5&subMin=1&subMax=10'
		)

		const expectedValidationToast = msg(
			toast_validation_error,
			TOAST_TEST_LOCALE
		)

		await page.getByTestId('btn-start').click()
		const validationToast = page
			.getByRole('alert')
			.filter({ hasText: expectedValidationToast })
		await expect(validationToast).toBeVisible()
	})

	test('negative answer input via minus key', async ({ page }) => {
		await startQuiz(page, {
			url: '/',
			operatorTestId: 'operator-1',
			waitForPuzzle: true
		})

		// Press minus to start negative number
		await page.keyboard.press('-')
		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toHaveValue('-')

		// Type a digit after minus
		await page.keyboard.type('5')
		await expect(answer).toHaveValue('-5')
	})
})
