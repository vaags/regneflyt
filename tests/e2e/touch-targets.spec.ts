import { expect, test } from '@playwright/test'
import {
	ADAPTIVE_PROFILES_KEY,
	openConfiguredMenu,
	readPuzzle,
	solvePuzzle,
	submitAnswer,
	waitForApp,
	waitForPuzzle
} from './e2eHelpers'

const MIN_TARGET_SIZE = 44

/** CSS selector for all interactive elements that need touch targets. */
const INTERACTIVE = 'button, a[href], select, [role="button"]'

/**
 * Asserts that every visible interactive element within `root` meets the
 * WCAG 2.2 SC 2.5.5 minimum touch-target size of 44×44 CSS pixels.
 */
async function assertAllTouchTargets(
	page: import('@playwright/test').Page,
	label: string,
	root = 'body'
) {
	const locator = page.locator(`${root} :is(${INTERACTIVE})`)

	const boxes = await locator.evaluateAll((els) =>
		els
			.filter((el) => {
				if (el.closest('[data-touch-exempt]')) return false
				const style = getComputedStyle(el)
				if (style.display === 'none' || style.visibility === 'hidden')
					return false
				if (style.position === 'absolute' && style.overflow === 'hidden')
					return false // sr-only elements
				const r = el.getBoundingClientRect()
				return r.width > 0 && r.height > 0
			})
			.map((el) => {
				const r = el.getBoundingClientRect()
				let width = r.width
				let height = r.height

				// Account for ::after pseudo-elements used to enlarge touch targets
				const after = getComputedStyle(el, '::after')
				if (after.content !== 'none' && after.position === 'absolute') {
					const afterW = parseFloat(after.minWidth) || 0
					const afterH = parseFloat(after.minHeight) || 0
					width = Math.max(width, afterW)
					height = Math.max(height, afterH)
				}

				return {
					id:
						el.getAttribute('data-testid') ??
						el.getAttribute('aria-label') ??
						el.textContent?.trim().slice(0, 40) ??
						el.tagName,
					tag: el.tagName.toLowerCase(),
					width,
					height
				}
			})
	)

	expect(boxes.length, `expected visible ${label} elements`).toBeGreaterThan(0)

	for (const box of boxes) {
		expect
			.soft(
				box.width,
				`${label} <${box.tag}> "${box.id}" width (${box.width}px)`
			)
			.toBeGreaterThanOrEqual(MIN_TARGET_SIZE)
		expect
			.soft(
				box.height,
				`${label} <${box.tag}> "${box.id}" height (${box.height}px)`
			)
			.toBeGreaterThanOrEqual(MIN_TARGET_SIZE)
	}
}

test.describe('touch target sizes (mobile viewport)', () => {
	test.use({ viewport: { width: 375, height: 667 } })

	test('menu screen interactive elements meet 44×44px minimum', async ({
		page
	}) => {
		await page.addInitScript((key) => {
			localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
		}, ADAPTIVE_PROFILES_KEY)
		await openConfiguredMenu(page)

		await assertAllTouchTargets(page, 'menu screen')
	})

	test('quiz screen interactive elements meet 44×44px minimum', async ({
		page
	}) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		await assertAllTouchTargets(page, 'quiz screen')
	})

	test('quiz screen fits within the iPhone SE viewport', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)
		await expect(page.getByTestId('quiz-input-tray')).toBeVisible()
		await expect(page.getByTestId('global-nav')).toBeVisible()

		const layoutMetrics = await page.evaluate(() => ({
			viewportHeight: window.innerHeight,
			scrollHeight: Math.max(
				document.documentElement.scrollHeight,
				document.body.scrollHeight
			)
		}))

		expect(layoutMetrics.scrollHeight).toBeLessThanOrEqual(
			layoutMetrics.viewportHeight + 1
		)
	})

	test('quiz cancel bar interactive elements meet 44×44px minimum', async ({
		page
	}) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		await page.getByTestId('btn-cancel').click()
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible()

		await assertAllTouchTargets(page, 'quiz cancel bar')
	})

	test('results screen interactive elements meet 44×44px minimum', async ({
		page
	}) => {
		await page.goto('/?duration=0&operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))
		await waitForPuzzle(page)

		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible()
		await page.getByTestId('btn-complete-yes').click()
		await expect(page.getByTestId('heading-results')).toBeVisible({
			timeout: 10_000
		})

		await assertAllTouchTargets(page, 'results screen')
	})
})
