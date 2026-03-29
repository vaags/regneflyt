import { expect, test, type Page } from '@playwright/test'
import {
	overwriteGetLocale,
	type Locale
} from '../../src/lib/paraglide/runtime.js'
import {
	toast_copy_link_deterministic_success,
	toast_copy_link_error,
	toast_copy_link_success
} from '../../src/lib/paraglide/messages.js'
import {
	ADAPTIVE_PROFILES_KEY,
	openConfiguredMenu,
	readPuzzle,
	solvePuzzle,
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

async function startQuiz(
	page: Page,
	options?: { url?: string; operatorTestId?: string }
) {
	const { url = '/', operatorTestId = 'operator-0' } = options ?? {}
	await page.goto(url)
	await waitForApp(page)
	await page.getByTestId(operatorTestId).check()
	await page.getByTestId('difficulty-1').check()
	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)
}

async function reachResults(page: Page) {
	await startQuiz(page, { url: '/?duration=0' })
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

async function stubClipboardWriteText(page: Page) {
	await page.addInitScript(() => {
		const clipboardStub = {
			writeText: async () => {}
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
	})
}

async function stubClipboardWriteTextError(page: Page) {
	await page.addInitScript(() => {
		const clipboardStub = {
			writeText: async () => {
				throw new Error('Clipboard write failed')
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
	})
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

	test('type answer and submit with Enter during quiz', async ({ page }) => {
		await startQuiz(page)

		const puzzle = await readPuzzle(page)
		await page.keyboard.type(solvePuzzle(puzzle).toString())
		await page.keyboard.press('Enter')

		// Should advance to puzzle 2
		await expect(page.getByTestId('puzzle-heading')).toContainText(/\d/)
	})

	test('backspace clears digit during quiz', async ({ page }) => {
		await startQuiz(page)

		// Type a digit, then backspace
		await page.keyboard.type('9')
		const expression = page.getByTestId('puzzle-expression')
		await expect(expression).toContainText('9')

		await page.keyboard.press('Backspace')
		await expect(expression).toContainText('?')
	})

	test('cancel flow aborts quiz via keyboard', async ({ page }) => {
		await startQuiz(page)

		await page.getByTestId('btn-cancel').click()
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible()
		await page.getByTestId('btn-cancel-yes').click()

		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
	})

	test('complete unlimited quiz with keyboard', async ({ page }) => {
		await startQuiz(page, { url: '/?duration=0' })

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

		await page.getByTestId('btn-settings').click()
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

		await page.getByTestId('btn-settings').click()
		await waitForSettingsRouteHydration(page)

		const startButton = page.getByTestId('btn-start')
		await startButton.focus()
		await page.keyboard.press('Enter')

		await waitForPuzzle(page)
	})

	test('skill dialog opens and closes with keyboard', async ({ page }) => {
		// Seed adaptive skills so percentage button renders
		await page.addInitScript((key) => {
			localStorage.setItem(key, JSON.stringify([80, 60, 40, 20]))
		}, ADAPTIVE_PROFILES_KEY)
		await page.goto('/')
		await waitForApp(page)

		// Tab to the skill percentage button and open with Enter
		const skillButton = page.getByRole('button', { name: /\d+%/ })
		await skillButton.focus()
		await page.keyboard.press('Enter')
		await expect(page.getByRole('dialog')).toBeVisible()

		// ESC should close dialog
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('copy link split button opens and closes with keyboard', async ({
		page
	}) => {
		await openConfiguredMenu(page)

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

	test('copy actions announce toast content for both link variants', async ({
		page
	}) => {
		await page.addInitScript((locale) => {
			document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/`
		}, TOAST_TEST_LOCALE)
		await stubClipboardWriteText(page)
		await openConfiguredMenu(page)
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

	test('error toast stays visible until manually dismissed', async ({
		page
	}) => {
		await page.addInitScript((locale) => {
			document.cookie = `PARAGLIDE_LOCALE=${locale}; path=/`
		}, TOAST_TEST_LOCALE)
		await stubClipboardWriteTextError(page)
		await openConfiguredMenu(page)
		const expectedErrorToast = msg(toast_copy_link_error, TOAST_TEST_LOCALE)

		await page.getByTestId('btn-copy-link').click()
		const errorToast = page.getByRole('alert')
		const errorToastMessage = errorToast.locator('p')
		await expect(errorToast).toBeVisible()
		await expect(errorToastMessage).toHaveText(expectedErrorToast)

		const didNotAutoDismiss = await errorToast
			.waitFor({ state: 'detached', timeout: 4_500 })
			.then(() => false)
			.catch(() => true)
		expect(didNotAutoDismiss).toBe(true)

		await errorToast.getByRole('button').click()
		await expect(errorToast).toBeHidden()
	})

	test('negative answer input via minus key', async ({ page }) => {
		await startQuiz(page, { operatorTestId: 'operator-1' })

		// Press minus to start negative number
		await page.keyboard.press('-')
		const expression = page.getByTestId('puzzle-expression')
		await expect(expression).toContainText('-')

		// Type a digit after minus
		await page.keyboard.type('5')
		await expect(expression).toContainText('-5')
	})
})
