import { expect, test, type Locator } from '@playwright/test'
import {
	button_copy_link,
	sr_show_hidden_value,
	sr_show_original_value
} from '../../src/lib/paraglide/messages.js'
import {
	msg,
	openConfiguredMenu,
	readPuzzle,
	readPuzzleNumber,
	setAdaptiveSkills,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle,
	waitForResults
} from './e2eHelpers'
import {
	contrastRatio,
	hasAccessibleIconButtonName,
	hasAccessibleLegendText,
	parseRGB
} from '../helpers/a11yInvariants'
import { appRoutes } from './appRoutes'

/** Offset added to the correct answer to guarantee a wrong submission. */
const WRONG_ANSWER_OFFSET = 999

/** WCAG 2.2 SC 1.4.11 minimum for focus indicators and other non-text content. */
const MIN_NON_TEXT_CONTRAST = 3

/** Runaway guard only; the sweep normally stops when focus wraps around. */
const TAB_SWEEP_LIMIT = 200

type RingSample = { id: string; ring: string; offset: string; surface: string }

type FocusIndicatorSample =
	| RingSample
	| {
			id: string
			problem: 'no-indicator' | 'unresolved-offset' | 'unresolved-surface'
	  }
	| { wrapped: true }

type TextContrastSample =
	| { foreground: string; background: string }
	| { problem: 'unresolved-foreground' | 'unresolved-background' }

function readTextContrast(element: HTMLElement): TextContrastSample {
	const canvas = document.createElement('canvas')
	canvas.width = 1
	canvas.height = 1
	const ctx = canvas.getContext('2d')
	if (ctx === null) return { problem: 'unresolved-foreground' }

	const measure = (value: string): string | null => {
		if (value === '') return null
		ctx.fillStyle = '#010203'
		const firstSentinel = ctx.fillStyle
		ctx.fillStyle = value
		if (ctx.fillStyle === firstSentinel) {
			ctx.fillStyle = '#040506'
			const secondSentinel = ctx.fillStyle
			ctx.fillStyle = value
			if (ctx.fillStyle === secondSentinel) return null
		}
		ctx.clearRect(0, 0, 1, 1)
		ctx.fillRect(0, 0, 1, 1)
		const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data
		return a === 255 ? `rgb(${r}, ${g}, ${b})` : null
	}

	const foreground = measure(getComputedStyle(element).color)
	if (foreground === null) return { problem: 'unresolved-foreground' }

	let surface: HTMLElement | null = element
	while (surface !== null) {
		const background = measure(getComputedStyle(surface).backgroundColor)
		if (background !== null) return { foreground, background }
		surface = surface.parentElement
	}

	return { problem: 'unresolved-background' }
}

function assertTextContrastSample(
	sample: TextContrastSample,
	minimum: number,
	label: string
): void {
	if ('problem' in sample) throw new Error(`${label}: ${sample.problem}`)

	const foreground = parseRGB(sample.foreground)
	const background = parseRGB(sample.background)
	if (foreground === null || background === null) {
		throw new Error(
			`${label}: unparseable colours ${sample.foreground} on ${sample.background}`
		)
	}

	expect(
		contrastRatio(foreground, background),
		`${label}: ${sample.foreground} on ${sample.background}`
	).toBeGreaterThanOrEqual(minimum)
}

async function assertTextContrast(
	element: Locator,
	minimum: number,
	label: string
): Promise<void> {
	let sample: TextContrastSample = { problem: 'unresolved-foreground' }
	await expect
		.poll(async () => {
			sample = await element.evaluate(readTextContrast)
			return 'problem' in sample ? sample.problem : 'resolved'
		})
		.toBe('resolved')
	const resolvedSample = await element.evaluate(readTextContrast)
	assertTextContrastSample(resolvedSample, minimum, label)
}

/**
 * Runs inside the page, so it must stay self-contained: Playwright serializes
 * it and it cannot close over anything in this module.
 */
function readFocusIndicator(): FocusIndicatorSample | null {
	const el = document.activeElement
	if (!(el instanceof HTMLElement)) return null

	// Marks the sweep's own trail so the caller can stop after a full cycle.
	if (el.hasAttribute('data-focus-swept')) return { wrapped: true }
	el.setAttribute('data-focus-swept', '')

	const style = getComputedStyle(el)
	const id = el.getAttribute('data-testid') ?? el.tagName.toLowerCase()
	const ring = style.getPropertyValue('--tw-ring-color').trim()
	const offset = style.getPropertyValue('--tw-ring-offset-color').trim()

	// Tailwind v4 emits oklch(); paint it to get sRGB channels back.
	const canvas = document.createElement('canvas')
	canvas.width = 1
	canvas.height = 1
	const ctx = canvas.getContext('2d')
	if (ctx === null) return null

	// Returns null for anything not fully opaque, so a colour that cannot be
	// proven opaque is never measured. Clearing first is what makes that
	// detectable: painting over the previous sample would composite alpha to 255.
	const measure = (value: string): string | null => {
		if (value === '') return null
		ctx.fillStyle = '#010203'
		const firstSentinel = ctx.fillStyle
		ctx.fillStyle = value
		if (ctx.fillStyle === firstSentinel) {
			ctx.fillStyle = '#040506'
			const secondSentinel = ctx.fillStyle
			ctx.fillStyle = value
			if (ctx.fillStyle === secondSentinel) return null
		}
		ctx.clearRect(0, 0, 1, 1)
		ctx.fillRect(0, 0, 1, 1)
		const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data
		return a === 255 ? `rgb(${r}, ${g}, ${b})` : null
	}

	const nearestOpaqueBackground = (
		start: HTMLElement | null
	): string | null => {
		let ancestor = start
		while (ancestor !== null) {
			const background = measure(getComputedStyle(ancestor).backgroundColor)
			if (background !== null) return background
			ancestor = ancestor.parentElement
		}
		return null
	}

	// A transparent ring is as invisible as no ring at all.
	const ringColor = measure(ring)
	if (ringColor === null) {
		// Tab can wrap out of the page onto <body>, which is not a control.
		const isControl = el.matches(
			'button, a[href], select, input, textarea, [role="button"]'
		)
		// No ring, so the control has to fall back to a real outline.
		const hasOutline =
			style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
		return !isControl || hasOutline
			? null
			: { id, problem: 'no-indicator' as const }
	}

	// focus-ring-surface leaves the offset transparent, so the ring sits directly
	// on whatever opaque surface is painted behind the control. Guessing a colour
	// here would silently pass or fail the wrong theme.
	const offsetColor = measure(offset) ?? nearestOpaqueBackground(el)
	if (offsetColor === null) return { id, problem: 'unresolved-offset' as const }

	// What the offset itself is drawn against. A ring that clears 3:1 against its
	// own offset can still vanish into the surface surrounding it.
	const surface = nearestOpaqueBackground(el.parentElement)
	if (surface === null) return { id, problem: 'unresolved-surface' as const }

	return { id, ring: ringColor, offset: offsetColor, surface }
}

function assertRingContrast(samples: readonly RingSample[]): void {
	for (const { id, ring, offset, surface } of samples) {
		const ringColor = parseRGB(ring)
		const offsetColor = parseRGB(offset)
		const surfaceColor = parseRGB(surface)
		// Samples are canvas-measured `rgb(r, g, b)`, so this is unreachable; it
		// throws rather than asserts because the checks below need the narrowing.
		if (ringColor === null || offsetColor === null || surfaceColor === null) {
			throw new Error(
				`unparseable colour for "${id}": ring ${ring}, offset ${offset}, surface ${surface}`
			)
		}

		expect(
			contrastRatio(ringColor, offsetColor),
			`focus indicator contrast for "${id}"`
		).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)

		expect(
			contrastRatio(ringColor, surfaceColor),
			`focus ring against the surface outside its offset for "${id}"`
		).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)
	}
}

/**
 * One fixture per sanctioned focus utility and the real surfaces it is used on.
 * The route sweep cannot reach `focus-ring-surface` or `focus-ring-inverse`,
 * whose only call sites sit behind dev-only or failure-only states.
 */
const FOCUS_UTILITY_FIXTURES = [
	{
		testId: 'focus-fixture-page',
		utility: 'focus-ring',
		surface: 'bg-stone-100 dark:bg-stone-900'
	},
	{
		testId: 'focus-fixture-alert-blue',
		utility: 'focus-ring-surface',
		surface: 'alert-blue'
	},
	{
		testId: 'focus-fixture-alert-yellow',
		utility: 'focus-ring-surface',
		surface: 'alert-yellow'
	},
	{
		testId: 'focus-fixture-alert-red',
		utility: 'focus-ring-surface',
		surface: 'alert-red'
	},
	{
		testId: 'focus-fixture-form-control',
		utility: 'focus-ring-control',
		surface: 'bg-stone-100 dark:bg-stone-900'
	},
	{
		testId: 'focus-fixture-form-control-error',
		utility: 'focus-ring-control-error',
		surface: 'bg-stone-100 dark:bg-stone-900'
	},
	{
		testId: 'focus-fixture-storage-alert',
		utility: 'focus-ring-surface',
		surface: 'bg-amber-50 dark:bg-amber-950'
	},
	{
		testId: 'focus-fixture-update-notification',
		utility: 'focus-ring-inverse',
		surface: 'bg-sky-700 dark:bg-sky-600'
	}
] as const

test.describe('WCAG regression tests', () => {
	for (const theme of ['light', 'dark'] as const) {
		test(`low-time text meets enhanced contrast in ${theme} mode`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme: theme })
			await startQuiz(page, {
				url: '/?duration=0.1&operator=0&difficulty=1',
				waitForPuzzle: true
			})

			const timer = page.getByTestId('quiz-timer')
			await expect(timer).toHaveClass(/text-amber-900/)
			await assertTextContrast(timer, 7, 'almost-finished timer')
		})

		test(`incorrect answer text meets enhanced contrast in ${theme} mode`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme: theme })
			await startQuiz(page, {
				url: '/?duration=0&operator=0&difficulty=1',
				waitForPuzzle: true
			})
			const puzzle = await readPuzzle(page)
			const wrongAnswer = solvePuzzle(puzzle) === 0 ? 1 : 0
			const answer = page.getByTestId('puzzle-answer-value')

			await answer.evaluate((element) => {
				const probe = window as unknown as {
					__incorrectAnswerContrast: TextContrastSample | null
					__incorrectAnswerHasErrorFocusUtility: boolean
				}
				probe.__incorrectAnswerContrast = null
				probe.__incorrectAnswerHasErrorFocusUtility = false
				if (!(element instanceof HTMLElement)) {
					probe.__incorrectAnswerContrast = {
						problem: 'unresolved-foreground'
					}
					return
				}

				const measureContrast = (): TextContrastSample => {
					const canvas = document.createElement('canvas')
					canvas.width = 1
					canvas.height = 1
					const ctx = canvas.getContext('2d')
					if (ctx === null) return { problem: 'unresolved-foreground' }

					const measure = (value: string): string | null => {
						if (value === '') return null
						ctx.fillStyle = '#010203'
						const firstSentinel = ctx.fillStyle
						ctx.fillStyle = value
						if (ctx.fillStyle === firstSentinel) {
							ctx.fillStyle = '#040506'
							const secondSentinel = ctx.fillStyle
							ctx.fillStyle = value
							if (ctx.fillStyle === secondSentinel) return null
						}
						ctx.clearRect(0, 0, 1, 1)
						ctx.fillRect(0, 0, 1, 1)
						const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(
							0,
							0,
							1,
							1
						).data
						return a === 255 ? `rgb(${r}, ${g}, ${b})` : null
					}

					const foreground = measure(getComputedStyle(element).color)
					if (foreground === null) return { problem: 'unresolved-foreground' }

					let surface: HTMLElement | null = element
					while (surface !== null) {
						const background = measure(
							getComputedStyle(surface).backgroundColor
						)
						if (background !== null) return { foreground, background }
						surface = surface.parentElement
					}

					return { problem: 'unresolved-background' }
				}

				const observer = new MutationObserver(() => {
					if (!element.classList.contains('text-red-900')) return
					probe.__incorrectAnswerContrast = measureContrast()
					probe.__incorrectAnswerHasErrorFocusUtility =
						element.classList.contains('focus-ring-control-error')
					observer.disconnect()
				})
				observer.observe(element, {
					attributes: true,
					attributeFilter: ['class']
				})
			})

			await page.getByTestId('numpad-delete').click()
			await page.getByTestId(`numpad-${wrongAnswer}`).click()
			await expect(answer).toHaveValue(String(wrongAnswer))
			await page.getByTestId('numpad-next').click()

			await expect
				.poll(() =>
					page.evaluate(
						() =>
							(
								window as unknown as {
									__incorrectAnswerContrast: TextContrastSample | null
								}
							).__incorrectAnswerContrast
					)
				)
				.not.toBeNull()
			const sample = await page.evaluate(
				() =>
					(
						window as unknown as {
							__incorrectAnswerContrast: TextContrastSample
						}
					).__incorrectAnswerContrast
			)
			assertTextContrastSample(sample, 4.5, 'large incorrect answer')
			await expect
				.poll(() =>
					page.evaluate(
						() =>
							(
								window as unknown as {
									__incorrectAnswerHasErrorFocusUtility: boolean
								}
							).__incorrectAnswerHasErrorFocusUtility
					)
				)
				.toBe(true)
		})

		test(`negative result delta meets enhanced contrast in ${theme} mode`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme: theme })
			await setAdaptiveSkills(page, [50, 50, 50, 50])
			await startQuiz(page, {
				url: '/?duration=0&operator=0&difficulty=1',
				waitForPuzzle: true
			})
			const puzzle = await readPuzzle(page)
			const puzzleNumber = await readPuzzleNumber(page)
			await submitAnswer(page, solvePuzzle(puzzle) + WRONG_ANSWER_OFFSET)
			await waitForNextPuzzle(page, puzzleNumber)
			await page.getByTestId('btn-complete-quiz').click()
			await page.getByTestId('btn-complete-yes').click()
			await waitForResults(page)
			const negativeDelta = page
				.locator('[data-testid$="-delta"]')
				.filter({ hasText: /^-/ })
				.first()
			await expect(negativeDelta).toBeVisible()
			await assertTextContrast(negativeDelta, 7, 'negative skill delta')
		})
	}

	test('incorrect answer is communicated with sr-only text, not just color', async ({
		page
	}) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const puzzle = await readPuzzle(page)
		const wrongAnswer = solvePuzzle(puzzle) + WRONG_ANSWER_OFFSET

		// Install a MutationObserver before submitting to capture the transient
		// announcement, which lives outside the atomic expression region so it is
		// not read behind a full re-read of the puzzle.
		await page.evaluate(() => {
			const probe = window as unknown as { __srOnlyText: string | null }
			probe.__srOnlyText = null
			const target = document.querySelector(
				'[data-testid="puzzle-incorrect-announcer"]'
			)
			if (!target) return
			const observer = new MutationObserver(() => {
				const text = target.textContent.trim()
				if (text) {
					probe.__srOnlyText = text
					observer.disconnect()
				}
			})
			observer.observe(target, {
				childList: true,
				subtree: true,
				characterData: true
			})
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

	test('the puzzle interaction is a named numeric-answer form', async ({
		page
	}) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		const puzzleForm = page.locator('form[data-puzzle-state="ready"]')
		await expect(puzzleForm).toHaveAttribute('aria-label', /.+/)
		await expect(puzzleForm).toHaveAttribute('autocomplete', 'off')
		await expect(puzzleForm).toHaveAttribute('novalidate', '')
		const answer = page.getByTestId('puzzle-answer-value')
		await expect(answer).toHaveAttribute('type', 'number')
		await expect(answer).toHaveAttribute('min', '-999')
		await expect(answer).toHaveAttribute('max', '999')
		await expect(answer).toHaveAttribute('step', '1')
		await expect(answer).not.toHaveAttribute('name')
		await expect(answer).not.toHaveAttribute('pattern')
		await expect(answer).not.toHaveAttribute('maxlength')
	})

	test('hidden value toggle has localized sr-only text', async ({
		page,
		context,
		baseURL
	}) => {
		const expectedTexts = [
			msg(button_copy_link, 'en'),
			msg(sr_show_original_value, 'en'),
			msg(sr_show_hidden_value, 'en')
		]

		// Seed locale cookie before first navigation so SSR renders English text.
		if (baseURL == null) {
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
		await waitForResults(page)

		const srOnlySpans = page.locator('button[aria-pressed] > .sr-only')
		const count = await srOnlySpans.count()
		expect(
			count,
			'results should contain at least one hidden-value toggle control'
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
		await openConfiguredMenu(page, 'operator=0&difficulty=0')

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
					clone.querySelectorAll('.sr-only').forEach((element) => {
						element.remove()
					})
					const visibleText = clone.textContent.trim()
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

	test('dialogs are named by their heading and focus the safe action', async ({
		page
	}) => {
		await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })

		const openDialog = page.locator('dialog[open]')

		await page.getByTestId('btn-cancel').click()
		const quitHeading = page.getByTestId('quit-dialog-heading')
		await expect(quitHeading).toBeVisible()

		await expect(openDialog).toHaveAttribute('aria-modal', 'true')
		const labelledBy = await openDialog.getAttribute('aria-labelledby')
		expect(labelledBy, 'dialog must reference its heading').toBeTruthy()
		await expect(quitHeading).toHaveAttribute('id', labelledBy ?? '')

		// Destructive confirmations must not put Enter on the destructive action.
		await expect(openDialog.getByTestId('btn-cancel-no')).toBeFocused()

		await openDialog.getByTestId('btn-cancel-no').click()
		await expect(quitHeading).toBeHidden()

		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible()
		await expect(openDialog.getByTestId('btn-dialog-close')).toBeFocused()
	})

	test('an invalid number range is associated with its error message', async ({
		page
	}) => {
		await openConfiguredMenu(
			page,
			'operator=0&difficulty=0&addMin=5&addMax=5&subMin=1&subMax=10'
		)

		for (const selectId of ['partOneMin-0', 'partOneMax-0']) {
			const select = page.locator(`#${selectId}`)
			await expect(select).toHaveAttribute('aria-invalid', 'true')
			const describedBy = await select.getAttribute('aria-describedby')
			expect(describedBy, `${selectId} must describe its error`).toBeTruthy()
			await expect(page.locator(`#${describedBy ?? ''}`)).not.toBeEmpty()
		}
	})

	test('quiz input focus moves from main to the visible answer field', async ({
		page
	}) => {
		await openConfiguredMenu(page)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const main = page.locator('#main-content')
		await expect(main).not.toBeFocused()
		await expect(page.getByTestId('puzzle-answer-value')).toBeFocused()
	})

	for (const theme of ['light', 'dark'] as const) {
		for (const route of appRoutes) {
			test(`${route.label} focus indicators meet the 3:1 non-text contrast minimum in ${theme} mode`, async ({
				page,
				browserName
			}) => {
				// macOS WebKit only Tabs to form controls unless the OS-level Full
				// Keyboard Access setting is on, so the sweep reaches no buttons or
				// links there. Chromium, Firefox, and WebKit elsewhere still cover this.
				// eslint-disable-next-line playwright/no-skipped-test -- platform limitation, not an app behaviour we can assert
				test.skip(
					browserName === 'webkit' && process.platform === 'darwin',
					'macOS WebKit skips buttons and links in tab order without Full Keyboard Access'
				)

				await page.emulateMedia({ colorScheme: theme })
				await route.open(page)

				const rings: RingSample[] = []
				const problems: string[] = []
				let completedCycle = false

				// The ring custom properties only resolve while :focus-visible matches,
				// so the indicator has to be reached by keyboard rather than by script.
				for (let i = 0; i < TAB_SWEEP_LIMIT; i++) {
					await page.keyboard.press('Tab')
					const sample = await page.evaluate(readFocusIndicator)
					if (sample === null) continue
					if ('wrapped' in sample) {
						completedCycle = true
						break
					}
					if ('problem' in sample)
						problems.push(`${sample.id}: ${sample.problem}`)
					else rings.push(sample)
				}

				// Without this the sweep would silently stop covering controls added
				// past the press limit.
				expect(
					completedCycle,
					`focus order must wrap within ${TAB_SWEEP_LIMIT} Tab presses`
				).toBe(true)

				expect(
					rings.length,
					'keyboard sweep should reach at least one ringed control'
				).toBeGreaterThan(0)

				expect(
					problems,
					'every keyboard-reachable control must paint a resolvable focus indicator'
				).toEqual([])

				assertRingContrast(rings)
			})
		}
	}

	for (const theme of ['light', 'dark'] as const) {
		test(`the sanctioned focus utilities meet 3:1 on every surface they are used on in ${theme} mode`, async ({
			page,
			browserName
		}) => {
			// Same macOS WebKit tab-order limitation as the per-route sweep above.
			// eslint-disable-next-line playwright/no-skipped-test -- platform limitation, not an app behaviour we can assert
			test.skip(
				browserName === 'webkit' && process.platform === 'darwin',
				'macOS WebKit skips buttons and links in tab order without Full Keyboard Access'
			)

			await page.emulateMedia({ colorScheme: theme })
			await page.goto('/')
			await waitForApp(page)

			const unpainted = await page.evaluate((fixtures) => {
				const container = document.createElement('div')
				const wrappers: { element: HTMLElement; surface: string }[] = []
				for (const { testId, utility, surface } of fixtures) {
					const wrapper = document.createElement('div')
					wrapper.className = surface
					const button = document.createElement('button')
					button.type = 'button'
					button.className = utility
					button.setAttribute('data-testid', testId)
					button.textContent = testId
					wrapper.appendChild(button)
					container.appendChild(wrapper)
					wrappers.push({ element: wrapper, surface })
				}
				// Prepended so a Tab from <body> lands on the first fixture.
				document.body.prepend(container)
				const active = document.activeElement
				if (active instanceof HTMLElement) active.blur()

				// These surface classes only exist in the bundle because app code uses
				// them. If Tailwind stops emitting one, the wrapper paints nothing and
				// the sweep would measure the page background instead of the surface.
				const canvas = document.createElement('canvas')
				canvas.width = 1
				canvas.height = 1
				const ctx = canvas.getContext('2d')
				if (ctx === null) return wrappers.map(({ surface }) => surface)
				return wrappers
					.filter(({ element }) => {
						const value = getComputedStyle(element).backgroundColor
						ctx.fillStyle = '#010203'
						const firstSentinel = ctx.fillStyle
						ctx.fillStyle = value
						if (ctx.fillStyle === firstSentinel) {
							ctx.fillStyle = '#040506'
							const secondSentinel = ctx.fillStyle
							ctx.fillStyle = value
							if (ctx.fillStyle === secondSentinel) return true
						}
						ctx.clearRect(0, 0, 1, 1)
						ctx.fillRect(0, 0, 1, 1)
						return ctx.getImageData(0, 0, 1, 1).data[3] !== 255
					})
					.map(({ surface }) => surface)
			}, FOCUS_UTILITY_FIXTURES)

			expect(
				unpainted,
				'fixture surface classes must resolve to a painted background'
			).toEqual([])

			const rings: RingSample[] = []
			const problems: string[] = []
			for (const fixture of FOCUS_UTILITY_FIXTURES) {
				await page.keyboard.press('Tab')
				const sample = await page.evaluate(readFocusIndicator)
				const label = `${fixture.utility} on ${fixture.surface}`

				if (sample === null) problems.push(`${label}: no focus sample`)
				else if ('wrapped' in sample)
					problems.push(`${label}: focus wrapped before reaching the fixture`)
				else if ('problem' in sample)
					problems.push(`${label}: ${sample.problem}`)
				else if (sample.id !== fixture.testId)
					problems.push(`${label}: Tab reached "${sample.id}" instead`)
				else rings.push(sample)
			}

			expect(
				problems,
				'every fixture must paint a resolvable focus indicator'
			).toEqual([])
			expect(rings.length).toBe(FOCUS_UTILITY_FIXTURES.length)
			assertRingContrast(rings)
		})
	}
})
