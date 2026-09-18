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
	setOperatorSkills,
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
	parseRGB
} from '../helpers/a11yInvariants'
import { appRoutes } from './appRoutes'
import { cleanupServiceWorkerTestState } from './fixtures'
import { installServiceWorkerMock } from './serviceWorkerMock'

/** Offset added to the correct answer to guarantee a wrong submission. */
const WRONG_ANSWER_OFFSET = 999

/** WCAG 2.2 SC 1.4.11 minimum for focus indicators and other non-text content. */
const MIN_NON_TEXT_CONTRAST = 3

/** Runaway guard only; the sweep normally stops when focus wraps around. */
const TAB_SWEEP_LIMIT = 200

type FocusIndicatorContrastSample = {
	id: string
	indicator: string
	surface: string
}

type FocusIndicatorSample =
	| FocusIndicatorContrastSample
	| {
			id: string
			problem: 'no-indicator' | 'unresolved-surface'
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
	const outline =
		style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
			? style.outlineColor
			: ''
	const paintedIndicator =
		outline !== ''
			? outline
			: style.boxShadow !== 'none'
				? style.getPropertyValue('--focus-ring-color').trim()
				: ''

	// Theme colours use oklch(); paint them to get sRGB channels back.
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

	const indicatorColor = measure(paintedIndicator)
	if (indicatorColor === null) {
		// Tab can wrap out of the page onto <body>, which is not a control.
		const isControl = el.matches(
			'button, a[href], select, input, textarea, [role="button"]'
		)
		return !isControl ? null : { id, problem: 'no-indicator' as const }
	}

	// The outline is offset outside the control, so its adjacent colour comes from
	// the nearest opaque ancestor rather than the control's own fill.
	const surface = nearestOpaqueBackground(el.parentElement)
	if (surface === null) return { id, problem: 'unresolved-surface' as const }

	return { id, indicator: indicatorColor, surface }
}

function assertFocusIndicatorContrast(
	samples: readonly FocusIndicatorContrastSample[]
): void {
	for (const { id, indicator, surface } of samples) {
		const indicatorColor = parseRGB(indicator)
		const surfaceColor = parseRGB(surface)
		// Samples are canvas-measured `rgb(r, g, b)`, so this is unreachable; it
		// throws rather than asserts because the checks below need the narrowing.
		if (indicatorColor === null || surfaceColor === null) {
			throw new Error(
				`unparseable colour for "${id}": indicator ${indicator}, surface ${surface}`
			)
		}

		expect(
			contrastRatio(indicatorColor, surfaceColor),
			`focus indicator contrast for "${id}"`
		).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)
	}
}

/**
 * One fixture per sanctioned focus primitive and representative real surface.
 * Failure-only and update-only surfaces are not reliably reachable by route
 * sweeps, so they are exercised explicitly here.
 */
const FOCUS_PRIMITIVE_FIXTURES = [
	{
		testId: 'focus-fixture-page',
		attributes: {},
		lightSurface: '#f5f5f4',
		darkSurface: '#1c1917'
	},
	{
		testId: 'focus-fixture-danger',
		attributes: { 'data-focus-danger': 'true' },
		lightSurface: '#f5f5f4',
		darkSurface: '#1c1917'
	}
] as const

test.describe('WCAG regression tests', () => {
	for (const theme of ['light', 'dark'] as const) {
		test(`low-time text meets enhanced contrast in ${theme} mode`, async ({
			page
		}) => {
			test.setTimeout(40_000)
			await page.emulateMedia({ colorScheme: theme })
			await startQuiz(page, {
				url: '/?duration=0.5&operator=0&difficulty=1',
				waitForPuzzle: true
			})

			const timer = page.getByTestId('quiz-timer')
			await expect(timer).toHaveAttribute('data-almost-finished', 'true', {
				timeout: 32_000
			})
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
					__incorrectAnswerFocusRingColor: string
					__incorrectAnswerDangerFocusColor: string
				}
				probe.__incorrectAnswerContrast = null
				probe.__incorrectAnswerFocusRingColor = ''
				probe.__incorrectAnswerDangerFocusColor = ''
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
					if (!element.hasAttribute('data-error')) return
					probe.__incorrectAnswerContrast = measureContrast()
					const style = getComputedStyle(element)
					probe.__incorrectAnswerFocusRingColor = style
						.getPropertyValue('--focus-ring-color')
						.trim()
					probe.__incorrectAnswerDangerFocusColor = style
						.getPropertyValue('--color-focus-danger')
						.trim()
					observer.disconnect()
				})
				observer.observe(element, {
					attributes: true,
					attributeFilter: ['data-error']
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
			const focusColors = await page.evaluate(
				() =>
					window as unknown as {
						__incorrectAnswerFocusRingColor: string
						__incorrectAnswerDangerFocusColor: string
					}
			)
			expect(focusColors.__incorrectAnswerFocusRingColor).toBe(
				focusColors.__incorrectAnswerDangerFocusColor
			)
		})

		test(`negative result delta meets enhanced contrast in ${theme} mode`, async ({
			page
		}) => {
			await page.emulateMedia({ colorScheme: theme })
			await setOperatorSkills(page, [50, 50, 50, 50])
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

		await submitAnswer(page, wrongAnswer)

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
			expect(text?.trim()).toBeTruthy()
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

		const srOnlySpans = page.locator('button[aria-pressed] > .visually-hidden')
		const count = await srOnlySpans.count()
		expect(
			count,
			'results should contain at least one hidden-value toggle control'
		).toBeGreaterThan(0)
		for (let i = 0; i < count; i++) {
			const text = (await srOnlySpans.nth(i).textContent())?.trim()
			expect(
				expectedTexts.includes(text ?? ''),
				`visually hidden text "${text}" should match an English translation`
			).toBe(true)
		}
	})

	test('copy link split button exposes accessible menu semantics', async ({
		page
	}) => {
		await openConfiguredMenu(page, 'operator=0&difficulty=0')

		const copyToggle = page.getByTestId('btn-copy-link-toggle')
		await expect(copyToggle).toHaveAttribute('aria-haspopup', 'menu')
		await expect(copyToggle).toHaveAttribute('aria-expanded', 'false')

		await copyToggle.click()
		await expect(copyToggle).toHaveAttribute('aria-expanded', 'true')
		const menu = page.getByRole('menu')
		await expect(menu).toHaveAttribute('popover', 'auto')
		await expect(menu.getByRole('menuitem')).toBeVisible()
		const menuId = await menu.getAttribute('id')
		if (menuId === null) throw new Error('Expected menu to have an id')
		await expect(copyToggle).toHaveAttribute('popovertarget', menuId)

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

				const indicators: FocusIndicatorContrastSample[] = []
				const problems: string[] = []
				let completedCycle = false

				// Focus indicators only match while :focus-visible is active, so reach
				// them by keyboard rather than assigning focus by script.
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
					else indicators.push(sample)
				}

				// Without this the sweep would silently stop covering controls added
				// past the press limit.
				expect(
					completedCycle,
					`focus order must wrap within ${TAB_SWEEP_LIMIT} Tab presses`
				).toBe(true)

				expect(
					indicators.length,
					'keyboard sweep should reach at least one focused control'
				).toBeGreaterThan(0)

				expect(
					problems,
					'every keyboard-reachable control must paint a resolvable focus indicator'
				).toEqual([])

				assertFocusIndicatorContrast(indicators)
			})
		}
	}

	test('native checkbox and radio focus remains visible in forced-colors mode', async ({
		page,
		browserName
	}) => {
		// Playwright exposes forced-colors emulation in Chromium only.
		// eslint-disable-next-line playwright/no-skipped-test -- browser capability, not an app behaviour we can assert elsewhere
		test.skip(
			browserName !== 'chromium',
			'forced-colors emulation requires Chromium'
		)

		await page.emulateMedia({ forcedColors: 'active' })
		await page.goto('/')
		await waitForApp(page)
		await page.evaluate(() => {
			const container = document.createElement('div')
			for (const type of ['checkbox', 'radio']) {
				const control = document.createElement('input')
				control.type = type
				control.setAttribute('data-testid', `forced-colors-${type}`)
				container.appendChild(control)
			}
			document.body.prepend(container)
		})

		for (const type of ['checkbox', 'radio']) {
			const control = page.getByTestId(`forced-colors-${type}`)
			await control.focus()
			const outline = await control.evaluate((element) => {
				const style = getComputedStyle(element)
				return { style: style.outlineStyle, width: style.outlineWidth }
			})
			expect(
				outline.style,
				`${type} needs a forced-colors focus outline`
			).not.toBe('none')
			expect(parseFloat(outline.width)).toBeGreaterThan(0)
		}
	})

	for (const theme of ['light', 'dark'] as const) {
		test(`the sanctioned focus primitives meet 3:1 on their representative surfaces in ${theme} mode`, async ({
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

			const unpainted = await page.evaluate(
				({ fixtures, colorScheme }) => {
					const container = document.createElement('div')
					const wrappers: { element: HTMLElement; surface: string }[] = []
					for (const fixture of fixtures) {
						const wrapper = document.createElement('div')
						const surface =
							colorScheme === 'dark'
								? fixture.darkSurface
								: fixture.lightSurface
						wrapper.style.backgroundColor = surface
						wrapper.style.padding = '1rem'
						const button = document.createElement('button')
						button.type = 'button'
						button.className = 'focus-indicator'
						for (const [name, value] of Object.entries(fixture.attributes)) {
							button.setAttribute(name, value)
						}
						button.setAttribute('data-testid', fixture.testId)
						button.textContent = fixture.testId
						wrapper.appendChild(button)
						container.appendChild(wrapper)
						wrappers.push({ element: wrapper, surface })
					}
					// Prepended so a Tab from <body> lands on the first fixture.
					document.body.prepend(container)
					const active = document.activeElement
					if (active instanceof HTMLElement) active.blur()

					// Assert that each explicit fixture surface resolved before measuring
					// focus contrast against it.
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
				},
				{ fixtures: FOCUS_PRIMITIVE_FIXTURES, colorScheme: theme }
			)

			expect(
				unpainted,
				'fixture surface classes must resolve to a painted background'
			).toEqual([])

			const indicators: FocusIndicatorContrastSample[] = []
			const problems: string[] = []
			for (const fixture of FOCUS_PRIMITIVE_FIXTURES) {
				await page.keyboard.press('Tab')
				const sample = await page.evaluate(readFocusIndicator)
				const label = fixture.testId

				if (sample === null) problems.push(`${label}: no focus sample`)
				else if ('wrapped' in sample)
					problems.push(`${label}: focus wrapped before reaching the fixture`)
				else if ('problem' in sample)
					problems.push(`${label}: ${sample.problem}`)
				else if (sample.id !== fixture.testId)
					problems.push(`${label}: Tab reached "${sample.id}" instead`)
				else indicators.push(sample)
			}

			expect(
				problems,
				'every fixture must paint a resolvable focus indicator'
			).toEqual([])
			expect(indicators.length).toBe(FOCUS_PRIMITIVE_FIXTURES.length)
			assertFocusIndicatorContrast(indicators)
		})

		test(`the inverse focus primitive meets 3:1 on the real update surface in ${theme} mode`, async ({
			page,
			context,
			browserName
		}) => {
			// Same macOS WebKit tab-order limitation as the per-route sweep above.
			// eslint-disable-next-line playwright/no-skipped-test -- platform limitation, not an app behaviour we can assert
			test.skip(
				browserName === 'webkit' && process.platform === 'darwin',
				'macOS WebKit skips buttons and links in tab order without Full Keyboard Access'
			)

			await page.emulateMedia({ colorScheme: theme })
			await installServiceWorkerMock(page, true)

			try {
				await page.goto('/')
				await waitForApp(page)
				await expect(
					page.getByTestId('update-notification-alert')
				).toBeVisible()

				let sample: FocusIndicatorSample | null = null
				for (let index = 0; index < TAB_SWEEP_LIMIT; index += 1) {
					await page.keyboard.press('Tab')
					sample = await page.evaluate(readFocusIndicator)
					if (
						sample !== null &&
						!('wrapped' in sample) &&
						!('problem' in sample) &&
						sample.id === 'btn-update-notification-update'
					) {
						break
					}
				}

				expect(sample).not.toBeNull()
				if (
					sample === null ||
					'wrapped' in sample ||
					'problem' in sample ||
					sample.id !== 'btn-update-notification-update'
				) {
					throw new Error('Keyboard focus did not reach the update action')
				}

				assertFocusIndicatorContrast([sample])
			} finally {
				await cleanupServiceWorkerTestState(page, context)
			}
		})
	}
})
