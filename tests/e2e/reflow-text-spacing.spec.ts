import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import type { Locale } from '../../src/lib/paraglide/runtime.js'
import { appRoutes } from './appRoutes'
import { startQuiz } from './e2eHelpers'

const REFLOW_VIEWPORT = { width: 320, height: 720 }
const TEXT_SPACING_VIEWPORT = { width: 375, height: 720 }
const RESIZE_TEXT_VIEWPORT = { width: 1280, height: 720 }
const GEOMETRY_TOLERANCE = 1
const SUPPORTED_LOCALES: readonly Locale[] = ['nb', 'en', 'fr', 'de', 'es']

const TEXT_SPACING_CSS = `
	:where(body, body *) {
		line-height: 1.5 !important;
		letter-spacing: 0.12em !important;
		word-spacing: 0.16em !important;
	}

	:where(p) {
		margin-bottom: 2em !important;
	}
`

type GeometryProblem = {
	id: string
	kind:
		| 'horizontal-document-overflow'
		| 'collapsed-text'
		| 'collapsed-control'
		| 'horizontal-text-loss'
		| 'horizontal-control-loss'
		| 'horizontal-ancestor-clipping'
		| 'vertical-ancestor-clipping'
	detail: string
}

type OverlayGeometryProblem = {
	id:
		| 'missing-toast'
		| 'missing-global-nav'
		| 'missing-expanded-nav-controls'
		| 'unresolved-toast-geometry'
		| 'unresolved-global-nav-geometry'
		| 'toast-global-nav-overlap'
	detail: string
}

async function setLocale(
	context: BrowserContext,
	baseURL: string | undefined,
	locale: Locale
): Promise<void> {
	if (baseURL === undefined) {
		throw new Error('Expected Playwright baseURL to be configured')
	}

	await context.addCookies([
		{
			name: 'PARAGLIDE_LOCALE',
			value: locale,
			url: baseURL
		}
	])
}

async function readGeometryProblems(page: Page): Promise<GeometryProblem[]> {
	return page.evaluate((tolerance) => {
		const problems: GeometryProblem[] = []
		const viewportWidth = document.documentElement.clientWidth
		const documentWidth = Math.max(
			document.documentElement.scrollWidth,
			document.body.scrollWidth
		)

		if (documentWidth > viewportWidth + tolerance) {
			problems.push({
				id: 'document',
				kind: 'horizontal-document-overflow',
				detail: `${documentWidth}px document in ${viewportWidth}px viewport`
			})
		}

		const rendered = (element: HTMLElement): boolean => {
			if (element.closest('[aria-hidden="true"], [hidden]')) return false

			const style = getComputedStyle(element)
			return !(
				style.display === 'none' ||
				style.visibility === 'hidden' ||
				parseFloat(style.opacity) === 0
			)
		}

		const intentionallyVisuallyHidden = (element: HTMLElement): boolean =>
			element.closest('.sr-only, #svelte-announcer') !== null

		const generatesBox = (element: HTMLElement): boolean =>
			element.getClientRects().length > 0

		const identify = (element: HTMLElement): string =>
			element.getAttribute('data-testid') ??
			element.getAttribute('aria-label') ??
			(element.textContent.trim().slice(0, 40) || element.tagName.toLowerCase())

		const recordAncestorClipping = (
			element: HTMLElement,
			contentRect: DOMRect | DOMRectReadOnly
		): void => {
			for (
				let ancestor = element.parentElement;
				ancestor && ancestor !== document.body;
				ancestor = ancestor.parentElement
			) {
				const style = getComputedStyle(ancestor)
				const ancestorRect = ancestor.getBoundingClientRect()
				if (ancestorRect.width <= 0 || ancestorRect.height <= 0) continue

				if (
					(style.overflowX === 'hidden' || style.overflowX === 'clip') &&
					(contentRect.left < ancestorRect.left - tolerance ||
						contentRect.right > ancestorRect.right + tolerance)
				) {
					problems.push({
						id: identify(element),
						kind: 'horizontal-ancestor-clipping',
						detail: `content ${contentRect.left.toFixed(1)}–${contentRect.right.toFixed(1)}px exceeds clipping ancestor ${identify(ancestor)} at ${ancestorRect.left.toFixed(1)}–${ancestorRect.right.toFixed(1)}px`
					})
				}

				if (
					(style.overflowY === 'hidden' || style.overflowY === 'clip') &&
					(contentRect.top < ancestorRect.top - tolerance ||
						contentRect.bottom > ancestorRect.bottom + tolerance)
				) {
					problems.push({
						id: identify(element),
						kind: 'vertical-ancestor-clipping',
						detail: `content ${contentRect.top.toFixed(1)}–${contentRect.bottom.toFixed(1)}px exceeds clipping ancestor ${identify(ancestor)} at ${ancestorRect.top.toFixed(1)}–${ancestorRect.bottom.toFixed(1)}px`
					})
				}
			}
		}

		for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
			if (!rendered(element) || intentionallyVisuallyHidden(element)) continue

			for (const node of element.childNodes) {
				if (
					node.nodeType !== Node.TEXT_NODE ||
					(node.textContent ?? '').trim().length === 0
				) {
					continue
				}

				const elementRect = element.getBoundingClientRect()
				if (generatesBox(element)) {
					recordAncestorClipping(element, elementRect)
				}
				if (
					generatesBox(element) &&
					(elementRect.width <= 0 || elementRect.height <= 0)
				) {
					problems.push({
						id: identify(element),
						kind: 'collapsed-text',
						detail: `text container is ${elementRect.width.toFixed(1)}×${elementRect.height.toFixed(1)}px`
					})
					break
				}

				const range = document.createRange()
				range.selectNodeContents(node)
				for (const rect of range.getClientRects()) {
					recordAncestorClipping(element, rect)
					if (
						rect.left < -tolerance ||
						rect.right > viewportWidth + tolerance
					) {
						problems.push({
							id: identify(element),
							kind: 'horizontal-text-loss',
							detail: `text bounds ${rect.left.toFixed(1)}–${rect.right.toFixed(1)}px`
						})
						break
					}
				}
			}
		}

		const controls = document.body.querySelectorAll<HTMLElement>(
			'button, a[href], input, select, textarea, img, svg, iframe'
		)
		for (const element of controls) {
			if (!rendered(element) || intentionallyVisuallyHidden(element)) continue
			if (!generatesBox(element)) continue
			const rect = element.getBoundingClientRect()
			const id = identify(element)
			recordAncestorClipping(element, rect)

			if (rect.width <= 0 || rect.height <= 0) {
				problems.push({
					id,
					kind: 'collapsed-control',
					detail: `control is ${rect.width.toFixed(1)}×${rect.height.toFixed(1)}px`
				})
				continue
			}

			if (rect.left < -tolerance || rect.right > viewportWidth + tolerance) {
				problems.push({
					id,
					kind: 'horizontal-control-loss',
					detail: `horizontal bounds ${rect.left.toFixed(1)}–${rect.right.toFixed(1)}px`
				})
			}
		}

		return problems.filter(
			(problem, index) =>
				problems.findIndex(
					(candidate) =>
						candidate.id === problem.id && candidate.kind === problem.kind
				) === index
		)
	}, GEOMETRY_TOLERANCE)
}

async function assertGeometry(page: Page, label: string): Promise<void> {
	await page.evaluate(() => document.fonts.ready)
	const problems = await readGeometryProblems(page)
	expect(problems, `${label} must not lose or clip rendered content`).toEqual(
		[]
	)
}

async function applyAndVerifyTwoHundredPercentTextResize(
	page: Page
): Promise<void> {
	await page.waitForLoadState('networkidle')
	const initialRootFontSize = await page.evaluate(() =>
		parseFloat(getComputedStyle(document.documentElement).fontSize)
	)
	const targetRootFontSize = initialRootFontSize * 2
	let resizedRootFontSize = initialRootFontSize

	for (let attempt = 0; attempt < 5; attempt += 1) {
		await page.addStyleTag({
			content: `:root:root { --wcag-text-resize-fixture: active; font-size: ${targetRootFontSize}px !important; }`
		})
		resizedRootFontSize = await page.evaluate(async () => {
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						resolve()
					})
				})
			})
			return parseFloat(getComputedStyle(document.documentElement).fontSize)
		})
		if (Math.abs(resizedRootFontSize - targetRootFontSize) < 0.000_005) break
	}

	const measurement =
		Math.abs(resizedRootFontSize - targetRootFontSize) < 0.000_005
			? {
					problem: null,
					initialRootFontSize,
					resizedRootFontSize
				}
			: {
					problem: 'unable-to-apply-200-percent-text-resize'
				}
	expect(
		measurement.problem,
		'200 percent resize requires an active authorized style fixture'
	).toBeNull()
	if (measurement.problem !== null) return
	expect(
		measurement.resizedRootFontSize,
		'root text size must be exactly doubled'
	).toBeCloseTo(measurement.initialRootFontSize * 2, 5)
}

async function readToastNavOverlayProblem(
	page: Page
): Promise<OverlayGeometryProblem | null> {
	return page.evaluate(() => {
		const toast = document.querySelector<HTMLElement>(
			'[data-testid="puzzle-answer-validation-toast"]'
		)
		if (!toast) {
			return {
				id: 'missing-toast',
				detail: 'Validation toast was not rendered'
			}
		}

		const globalNav = document.querySelector<HTMLElement>(
			'[data-sticky-global-nav]'
		)
		if (!globalNav) {
			return {
				id: 'missing-global-nav',
				detail: 'Expanded global navigation was not rendered'
			}
		}

		if (!globalNav.querySelector('[data-testid="numpad-next"]')) {
			return {
				id: 'missing-expanded-nav-controls',
				detail: 'Global navigation did not render the expanded quiz controls'
			}
		}

		const toastRect = toast.getBoundingClientRect()
		const navRect = globalNav.getBoundingClientRect()
		if (toastRect.width <= 0 || toastRect.height <= 0) {
			return {
				id: 'unresolved-toast-geometry',
				detail: `Validation toast is ${toastRect.width.toFixed(1)}×${toastRect.height.toFixed(1)}px`
			}
		}
		if (navRect.width <= 0 || navRect.height <= 0) {
			return {
				id: 'unresolved-global-nav-geometry',
				detail: `Expanded global navigation is ${navRect.width.toFixed(1)}×${navRect.height.toFixed(1)}px`
			}
		}
		const intersects =
			toastRect.left < navRect.right &&
			toastRect.right > navRect.left &&
			toastRect.top < navRect.bottom &&
			toastRect.bottom > navRect.top

		return intersects
			? {
					id: 'toast-global-nav-overlap',
					detail: `toast ${toastRect.top.toFixed(1)}–${toastRect.bottom.toFixed(1)}px intersects nav ${navRect.top.toFixed(1)}–${navRect.bottom.toFixed(1)}px`
				}
			: null
	})
}

async function assertValidationToastClearsExpandedNav(
	page: Page,
	context: BrowserContext,
	baseURL: string | undefined,
	locale: Locale,
	withTextSpacing: boolean
): Promise<void> {
	await setLocale(context, baseURL, locale)
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })
	if (withTextSpacing) {
		await page.addStyleTag({ content: TEXT_SPACING_CSS })
	}
	await page.keyboard.press('Enter')
	await expect(page.getByTestId('puzzle-answer-validation-toast')).toBeVisible()
	const globalNav = page.getByTestId('global-nav')
	await expect(globalNav).toBeVisible()
	await expect(globalNav.getByTestId('numpad-next')).toBeVisible()
	await page.evaluate(() => document.fonts.ready)

	const problem = await readToastNavOverlayProblem(page)
	expect(
		problem,
		'Validation toast must not overlap the expanded quiz navigation'
	).toBeNull()
}

test.describe('WCAG reflow at 320 CSS px', () => {
	test.use({ viewport: REFLOW_VIEWPORT })

	for (const route of appRoutes) {
		test(`${route.label} reflows without horizontal content loss`, async ({
			page
		}) => {
			await page.emulateMedia({ reducedMotion: 'reduce' })
			await route.open(page)
			await assertGeometry(page, route.label)
		})
	}
})

test.describe('WCAG text resize at 200 percent', () => {
	test.use({ viewport: RESIZE_TEXT_VIEWPORT })

	for (const route of appRoutes) {
		test(`${route.label} preserves content at 200 percent text size`, async ({
			page
		}) => {
			await page.emulateMedia({ reducedMotion: 'reduce' })
			await route.open(page)
			await applyAndVerifyTwoHundredPercentTextResize(page)
			await assertGeometry(page, `${route.label} at 200 percent text size`)
		})
	}
})

test.describe('reflow geometry scanner integrity', () => {
	test('reports unexpectedly collapsed meaningful content', async ({
		page
	}) => {
		await page.goto('/')
		await page.evaluate(() => {
			const collapsedText = document.createElement('div')
			collapsedText.dataset.testid = 'collapsed-text-fixture'
			collapsedText.style.cssText =
				'position:fixed;width:0;height:0;overflow:hidden'
			collapsedText.textContent = 'Meaningful clipped text'

			const collapsedControl = document.createElement('button')
			collapsedControl.dataset.testid = 'collapsed-control-fixture'
			collapsedControl.style.cssText =
				'position:fixed;width:0;height:0;padding:0;border:0;overflow:hidden'
			collapsedControl.textContent = 'Clipped action'

			const clippingAncestor = document.createElement('div')
			clippingAncestor.dataset.testid = 'clipping-ancestor-fixture'
			clippingAncestor.style.cssText =
				'position:fixed;left:0;top:100px;width:80px;height:20px;overflow:hidden'
			const clippedText = document.createElement('span')
			clippedText.dataset.testid = 'ancestor-clipped-text-fixture'
			clippedText.style.cssText =
				'display:block;width:240px;height:40px;white-space:nowrap'
			clippedText.textContent = 'Meaningful text clipped by an ancestor'
			clippingAncestor.append(clippedText)

			document.body.append(collapsedText, collapsedControl, clippingAncestor)
		})

		for (const testId of [
			'collapsed-text-fixture',
			'collapsed-control-fixture'
		]) {
			const rect = await page.getByTestId(testId).evaluate((element) => {
				const bounds = element.getBoundingClientRect()
				return { width: bounds.width, height: bounds.height }
			})
			expect(
				rect,
				`${testId} must render collapsed for this negative control`
			).toEqual({ width: 0, height: 0 })
		}

		const clippingFixtureGeometry = await page.evaluate(() => {
			const ancestor = document.querySelector<HTMLElement>(
				'[data-testid="clipping-ancestor-fixture"]'
			)
			const content = document.querySelector<HTMLElement>(
				'[data-testid="ancestor-clipped-text-fixture"]'
			)
			if (!ancestor || !content) {
				return { problem: 'missing-clipping-negative-fixture' } as const
			}
			const ancestorRect = ancestor.getBoundingClientRect()
			const contentRect = content.getBoundingClientRect()
			return {
				problem: null,
				ancestorWidth: ancestorRect.width,
				ancestorHeight: ancestorRect.height,
				contentWidth: contentRect.width,
				contentHeight: contentRect.height,
				overflow: getComputedStyle(ancestor).overflow
			} as const
		})
		expect(clippingFixtureGeometry).toEqual({
			problem: null,
			ancestorWidth: 80,
			ancestorHeight: 20,
			contentWidth: 240,
			contentHeight: 40,
			overflow: 'hidden'
		})

		const problems = await readGeometryProblems(page)
		expect(problems).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'collapsed-text-fixture',
					kind: 'collapsed-text'
				}),
				expect.objectContaining({
					id: 'collapsed-control-fixture',
					kind: 'collapsed-control'
				}),
				expect.objectContaining({
					id: 'ancestor-clipped-text-fixture',
					kind: 'horizontal-ancestor-clipping'
				}),
				expect.objectContaining({
					id: 'ancestor-clipped-text-fixture',
					kind: 'vertical-ancestor-clipping'
				})
			])
		)
	})
})

test.describe('WCAG text-spacing horizontal-loss regressions', () => {
	test.use({ viewport: TEXT_SPACING_VIEWPORT })

	for (const locale of SUPPORTED_LOCALES) {
		for (const route of appRoutes) {
			test(`${route.label} avoids horizontal loss with prescribed spacing in ${locale}`, async ({
				page,
				context,
				baseURL
			}) => {
				await setLocale(context, baseURL, locale)
				await page.emulateMedia({ reducedMotion: 'reduce' })
				await route.open(page)
				await page.addStyleTag({ content: TEXT_SPACING_CSS })
				await assertGeometry(page, `${route.label} (${locale})`)
			})
		}
	}
})

test.describe('quiz validation overlay geometry', () => {
	test.use({ viewport: { width: 320, height: 568 } })

	for (const locale of SUPPORTED_LOCALES) {
		for (const withTextSpacing of [false, true]) {
			test(`validation toast clears expanded navigation in ${locale}${withTextSpacing ? ' with prescribed text spacing' : ''}`, async ({
				page,
				context,
				baseURL
			}) => {
				await assertValidationToastClearsExpandedNav(
					page,
					context,
					baseURL,
					locale,
					withTextSpacing
				)
			})
		}
	}
})
