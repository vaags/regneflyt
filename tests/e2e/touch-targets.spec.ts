import { expect, test, type Page } from '@playwright/test'
import { appRoutes } from './appRoutes'
import { cleanupServiceWorkerTestState } from './fixtures'
import { installServiceWorkerMock } from './serviceWorkerMock'
import { ADAPTIVE_PROFILES_KEY, waitForApp, waitForPuzzle } from './e2eHelpers'

const MIN_TARGET_SIZE = 44

/** CSS selector for all interactive elements that need touch targets. */
const INTERACTIVE =
	'button, a[href], select, input, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'

/**
 * Asserts that every visible interactive element within `root` meets the
 * WCAG 2.2 SC 2.5.5 minimum touch-target size of 44×44 CSS pixels.
 */
async function assertAllTouchTargets(page: Page, label: string, root = 'body') {
	const locator = page.locator(`${root} :is(${INTERACTIVE})`)

	const boxes = await locator.evaluateAll((els) => {
		// The ::after pseudo-element is the sanctioned way to enlarge a small control.
		const measure = (el: Element) => {
			const rect = el.getBoundingClientRect()
			const after = getComputedStyle(el, '::after')
			const expandsHitArea =
				after.content !== 'none' && after.position === 'absolute'

			return {
				width: expandsHitArea
					? Math.max(rect.width, parseFloat(after.minWidth) || 0)
					: rect.width,
				height: expandsHitArea
					? Math.max(rect.height, parseFloat(after.minHeight) || 0)
					: rect.height
			}
		}

		// Clicking a label activates its control, so the label is part of the target.
		const labelOf = (el: Element) => {
			const wrapping = el.closest('label')
			if (wrapping) return wrapping
			const id = el.getAttribute('id')
			if (id === null || id === '') return null
			return document.querySelector(`label[for="${CSS.escape(id)}"]`)
		}

		return els
			.filter((el) => {
				const style = getComputedStyle(el)
				if (style.display === 'none' || style.visibility === 'hidden')
					return false
				const r = el.getBoundingClientRect()
				// Matches `sr-only`, which also clamps to 1px. Testing overflow alone
				// would silently drop any absolutely positioned real control.
				if (
					style.position === 'absolute' &&
					style.overflow === 'hidden' &&
					r.width <= 1 &&
					r.height <= 1
				)
					return false
				return r.width > 0 && r.height > 0
			})
			.map((el) => {
				// Only checkboxes and radios really delegate their target to a label:
				// clicking a <select>'s label focuses it but does not open the option
				// list, so a select has to be large enough on its own.
				const delegatesToLabel =
					el instanceof HTMLInputElement &&
					(el.type === 'checkbox' || el.type === 'radio')
				const associatedLabel = delegatesToLabel ? labelOf(el) : null
				// The label is the clickable target, so measure it rather than mixing
				// the two boxes axis by axis.
				const box = measure(associatedLabel ?? el)

				return {
					id:
						el.getAttribute('data-testid') ??
						el.getAttribute('aria-label') ??
						(el.textContent.trim().slice(0, 40) || el.tagName),
					tag: el.tagName.toLowerCase(),
					width: box.width,
					height: box.height
				}
			})
	})

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

	for (const route of appRoutes) {
		test(`${route.label} screen interactive elements meet 44×44px minimum`, async ({
			page
		}) => {
			// Seed adaptive skills so the skill-percentage button renders.
			await page.addInitScript((key) => {
				localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
			}, ADAPTIVE_PROFILES_KEY)
			await route.open(page)

			await assertAllTouchTargets(page, `${route.label} screen`)
		})
	}

	test('quiz screen fits within the iPhone SE viewport', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)
		await expect(page.getByTestId('global-nav')).toBeVisible()
		await expect(page.getByTestId('numpad-next')).toBeVisible()

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

	test('quit confirmation interactive elements meet 44×44px minimum', async ({
		page
	}) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		await page.getByTestId('btn-cancel').click()
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible()

		await assertAllTouchTargets(page, 'quit confirmation', 'dialog[open]')
	})

	test.describe('update notification', () => {
		test.afterEach(async ({ page, context }) => {
			await cleanupServiceWorkerTestState(page, context)
		})

		test('interactive elements meet 44×44px minimum', async ({ page }) => {
			// Driven by the service worker mock rather than the dev-only
			// simulate-update control, so this also runs against the CI preview.
			await installServiceWorkerMock(page, true)

			await page.goto('/')
			await waitForApp(page)
			await expect(page.getByTestId('update-notification-alert')).toBeVisible()

			await assertAllTouchTargets(
				page,
				'update notification',
				'[data-testid="update-notification-alert"]'
			)
		})
	})
})
