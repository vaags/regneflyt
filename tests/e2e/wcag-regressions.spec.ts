import { test, expect } from '@playwright/test'
import {
	overwriteGetLocale,
	type Locale
} from '../../src/lib/paraglide/runtime.js'
import {
	sr_show_hidden_value,
	sr_show_original_value
} from '../../src/lib/paraglide/messages.js'
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

/** Call a paraglide message function with a specific locale. */
function msg(fn: () => string, locale: Locale): string {
	overwriteGetLocale(() => locale)
	return fn()
}

/** Offset added to the correct answer to guarantee a wrong submission. */
const WRONG_ANSWER_OFFSET = 999

test.describe('WCAG regression tests', () => {
	test('incorrect answer is communicated with sr-only text, not just color', async ({
		page
	}) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const puzzle = await readPuzzle(page)
		const wrongAnswer = solvePuzzle(puzzle) + WRONG_ANSWER_OFFSET

		// Install a MutationObserver before submitting to capture the transient sr-only element
		await page.evaluate(() => {
			;(window as unknown as Record<string, unknown>).__srOnlyText = null
			const target = document.querySelector('[data-testid="puzzle-expression"]')
			if (!target) return
			const observer = new MutationObserver(() => {
				const el = target.querySelector('span.sr-only')
				if (el?.textContent?.trim()) {
					;(window as unknown as Record<string, string | null>).__srOnlyText =
						el.textContent.trim()
					observer.disconnect()
				}
			})
			observer.observe(target, { childList: true, subtree: true })
		})

		await page.keyboard.type(wrongAnswer.toString())
		await page.keyboard.press('Enter')

		// Wait for the observer to capture the sr-only text during the correction flash
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						(window as unknown as Record<string, string | null>).__srOnlyText
				)
			)
			.not.toBeNull()
	})

	test('every fieldset has an accessible legend', async ({ page }) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const fieldsets = page.locator('fieldset')
		const count = await fieldsets.count()
		expect(count, 'page should contain at least one fieldset').toBeGreaterThan(
			0
		)
		for (let i = 0; i < count; i++) {
			const legend = fieldsets.nth(i).locator('legend')
			await expect(legend).toBeAttached()
			const text = await legend.textContent()
			expect(text?.trim().length).toBeGreaterThan(0)
		}
	})

	test('every form has an accessible name', async ({ page }) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const forms = page.locator('form')
		const count = await forms.count()
		expect(count, 'page should contain at least one form').toBeGreaterThan(0)
		for (let i = 0; i < count; i++) {
			const form = forms.nth(i)
			const label = await form.getAttribute('aria-label')
			const labelledBy = await form.getAttribute('aria-labelledby')
			expect(
				(label?.trim().length ?? 0) > 0 || (labelledBy?.trim().length ?? 0) > 0,
				`form #${i} must have aria-label or aria-labelledby`
			).toBe(true)
		}
	})

	test('hidden value toggle has localized sr-only text', async ({ page }) => {
		const expectedTexts = [
			msg(sr_show_original_value, 'en'),
			msg(sr_show_hidden_value, 'en')
		]

		// Use English locale to verify sr-only text adapts to locale
		await page.addInitScript(() => {
			document.cookie = 'PARAGLIDE_LOCALE=en; path=/'
		})
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const puzzle = await readPuzzle(page)
		const puzzleNum = await readPuzzleNumber(page)
		await submitAnswer(page, solvePuzzle(puzzle) + WRONG_ANSWER_OFFSET)
		await waitForNextPuzzle(page, puzzleNum)

		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible()
		await page.getByTestId('btn-complete-yes').click()
		await expect(page.getByTestId('heading-results')).toBeVisible()

		const srOnlySpans = page.locator('button > .sr-only')
		const count = await srOnlySpans.count()
		expect(
			count,
			'results should contain at least one hidden value toggle'
		).toBeGreaterThan(0)
		for (let i = 0; i < count; i++) {
			const text = (await srOnlySpans.nth(i).textContent())?.trim()
			expect(
				expectedTexts.includes(text ?? ''),
				`sr-only text "${text}" should match an English translation`
			).toBe(true)
		}
	})

	test('share dialog input has autocomplete off', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1&showSettings=true')
		await waitForApp(page)

		const shareToggle = page
			.getByTestId('menu-actions')
			.getByTestId('btn-share')
		await shareToggle.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		const input = dialog.locator('input[type="text"]')
		await expect(input).toHaveAttribute('autocomplete', 'off')
	})

	test('every icon-only button has an accessible label', async ({ page }) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		// Find all buttons whose only visible content is an SVG (icon-only)
		const iconButtons = page.locator(
			'button:has(svg):not(:has(span:not(.sr-only)))'
		)
		const count = await iconButtons.count()
		expect(
			count,
			'page should contain at least one icon-only button'
		).toBeGreaterThan(0)

		for (let i = 0; i < count; i++) {
			const btn = iconButtons.nth(i)
			const svg = btn.locator('svg')
			const svgCount = await svg.count()
			if (svgCount === 0) continue

			// Icon must either have its own aria-label or the button must
			const svgLabel = await svg.first().getAttribute('aria-label')
			const btnLabel = await btn.getAttribute('aria-label')
			const btnText = await btn.textContent()
			const hasSrOnly = (await btn.locator('.sr-only').count()) > 0

			expect(
				(svgLabel?.trim().length ?? 0) > 0 ||
					(btnLabel?.trim().length ?? 0) > 0 ||
					(btnText?.trim().length ?? 0) > 0 ||
					hasSrOnly,
				`icon-only button #${i} must have an accessible name`
			).toBe(true)
		}
	})
})
