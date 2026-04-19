import { expect, test, type Page } from '@playwright/test'
import {
	overwriteGetLocale,
	type Locale
} from '../../src/lib/paraglide/runtime.js'
import {
	toast_copy_link_deterministic_success,
	toast_copy_link_error,
	toast_copy_link_success,
	toast_copy_link_validation_error,
	toast_validation_error
} from '../../src/lib/paraglide/messages.js'
import {
	openConfiguredMenu,
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForPuzzle,
	waitForSettingsRouteHydration
} from './e2eHelpers'

const TOAST_TEST_LOCALE: Locale = 'nb'

function msg(fn: () => string, locale: Locale): string {
	overwriteGetLocale(() => locale)
	return fn()
}

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
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})
}

type ClipboardStubMode = 'success' | 'error' | 'tracking'

async function stubClipboardWriteText(
	page: Page,
	mode: ClipboardStubMode = 'success'
) {
	await page.addInitScript((stubMode: ClipboardStubMode) => {
		if (stubMode === 'tracking') {
			;(
				window as Window & { __clipboardWriteCalls?: number }
			).__clipboardWriteCalls = 0
		}

		const clipboardStub = {
			writeText: async () => {
				if (stubMode === 'error') {
					throw new Error('Clipboard write failed')
				}

				if (stubMode === 'tracking') {
					;(
						window as Window & { __clipboardWriteCalls?: number }
					).__clipboardWriteCalls =
						((window as Window & { __clipboardWriteCalls?: number })
							.__clipboardWriteCalls ?? 0) + 1
				}
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
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		await page.keyboard.press('Tab')
		const skipLink = page.locator('a[href="#main-content"]')
		await expect(skipLink).toBeFocused()
		// The skip link uses sr-only + focus:not-sr-only — it should be visible when focused
		await expect(skipLink).toBeVisible()
	})

	test('tab through menu selects all interactive controls', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		const focusedElements: string[] = []
		// Tab through menu elements — collect tag names of focused elements
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('Tab')
			const tag = await page.evaluate(() => {
				const el = document.activeElement
				if (!el || el === document.body) return 'BODY'
				return el.tagName
			})
			focusedElements.push(tag)
		}

		// Should have focused buttons, inputs, and radio/select elements
		expect(focusedElements).toContain('BUTTON')
		expect(focusedElements.some((t) => t === 'INPUT' || t === 'SELECT')).toBe(
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

	test('backspace clears digit during quiz', async ({ page }) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		// Type a digit, then backspace
		await page.keyboard.type('9')
		const expression = page.getByTestId('puzzle-expression')
		await expect(expression).toContainText('9')

		await page.keyboard.press('Backspace')
		await expect(expression).toContainText('?')
	})

	test('repeated submit with missing input does not advance puzzle', async ({
		page
	}) => {
		await startQuiz(page, { url: '/', waitForPuzzle: true })

		const initialPuzzleNumber = await readPuzzleNumber(page)

		// Empty submit sets a validation error state that disables the next button.
		await page.keyboard.press('Enter')

		// Enter maps to the same complete action and must remain a no-op here.
		await page.keyboard.press('Enter')
		await expect
			.poll(async () => readPuzzleNumber(page), {
				timeout: 1_500,
				intervals: [150, 300, 600]
			})
			.toBe(initialPuzzleNumber)
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
		await expect(page.getByTestId('heading-results')).toBeVisible({
			timeout: 5_000
		})
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

		await expect(page.getByTestId('heading-results')).toBeVisible({
			timeout: 10_000
		})
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
		await expect(page.getByTestId('heading-results')).toBeVisible()
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

		const successToast = page.getByRole('status')
		const successToastMessage = successToast.locator('p')

		await page.getByTestId('btn-copy-link').click()
		await expect(successToast).toBeVisible()
		await expect(successToastMessage).toHaveText(expectedPrimaryToast)

		await page.getByTestId('btn-copy-link-toggle').click()
		await page.getByTestId('btn-copy-link-secondary').click()
		await expect(successToast).toBeVisible()
		await expect(successToastMessage).toHaveText(expectedSecondaryToast)
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
		const errorToastMessage = errorToast.locator('p')
		await expect(errorToast).toBeVisible()
		await expect(errorToastMessage).toHaveText(expectedErrorToast)

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
		const expression = page.getByTestId('puzzle-expression')
		await expect(expression).toContainText('-')

		// Type a digit after minus
		await page.keyboard.type('5')
		await expect(expression).toContainText('-5')
	})
})
