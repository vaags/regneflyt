import { expect, test } from '@playwright/test'
import {
	overwriteGetLocale,
	type Locale
} from '../../src/lib/paraglide/runtime.js'
import {
	sr_show_hidden_value,
	sr_show_original_value
} from '../../src/lib/paraglide/messages.js'
import {
	openConfiguredMenu,
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'
import {
	hasAccessibleFormName,
	hasAccessibleIconButtonName,
	hasAccessibleLegendText
} from '../helpers/a11yInvariants'

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
			expect(hasAccessibleLegendText(text)).toBe(true)
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
				hasAccessibleFormName({
					ariaLabel: label,
					ariaLabelledBy: labelledBy
				}),
				`form #${i} must have aria-label or aria-labelledby`
			).toBe(true)
		}
	})

	test('hidden value toggle has localized sr-only text', async ({
		page,
		context,
		baseURL
	}) => {
		const expectedTexts = [
			msg(sr_show_original_value, 'en'),
			msg(sr_show_hidden_value, 'en')
		]

		// Seed locale cookie before first navigation so SSR renders English text.
		if (!baseURL) {
			throw new Error('Expected Playwright baseURL to be configured')
		}
		await context.addCookies([
			{
				name: 'PARAGLIDE_LOCALE',
				value: 'en',
				url: baseURL
			}
		])
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

	test('copy link split button exposes accessible menu semantics', async ({
		page
	}) => {
		await openConfiguredMenu(page)

		const copyToggle = page.getByTestId('btn-copy-link-toggle')
		await expect(copyToggle).toHaveAttribute('aria-haspopup', 'true')
		await expect(copyToggle).toHaveAttribute('aria-expanded', 'false')

		await copyToggle.click()
		await expect(copyToggle).toHaveAttribute('aria-expanded', 'true')
		await expect(page.getByTestId('btn-copy-link-secondary')).toBeVisible()

		await page.keyboard.press('Escape')
		await expect(copyToggle).toHaveAttribute('aria-expanded', 'false')
	})

	test('every icon-only button has an accessible label', async ({ page }) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const iconButtons = await page.locator('button').evaluateAll((buttons) =>
			buttons
				.filter((button) => {
					const style = getComputedStyle(button)
					if (style.display === 'none' || style.visibility === 'hidden') {
						return false
					}

					const rect = button.getBoundingClientRect()
					if (rect.width === 0 || rect.height === 0) return false

					const clone = button.cloneNode(true) as HTMLElement
					clone
						.querySelectorAll('.sr-only')
						.forEach((element) => element.remove())
					const visibleText = clone.textContent?.trim() ?? ''
					const hasSvg = button.querySelector('svg') !== null
					const isSymbolOnly =
						visibleText.length > 0 && !/[\p{L}\p{N}]/u.test(visibleText)

					return hasSvg || isSymbolOnly
				})
				.map((button) => ({
					svgAriaLabel: button.querySelector('svg')?.getAttribute('aria-label'),
					buttonAriaLabel: button.getAttribute('aria-label'),
					buttonText: button.textContent,
					hasSrOnlyText: button.querySelector('.sr-only') !== null
				}))
		)
		const count = iconButtons.length
		expect(
			count,
			'page should contain at least one icon-only button'
		).toBeGreaterThan(0)

		for (const [index, button] of iconButtons.entries()) {
			expect(
				hasAccessibleIconButtonName({
					svgAriaLabel: button.svgAriaLabel,
					buttonAriaLabel: button.buttonAriaLabel,
					buttonText: button.buttonText,
					hasSrOnlyText: button.hasSrOnlyText
				}),
				`icon-only button #${index} must have an accessible name`
			).toBe(true)
		}
	})
})
