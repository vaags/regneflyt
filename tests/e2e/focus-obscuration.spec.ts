import { expect, test, type Page } from '@playwright/test'
import { appRoutes } from './appRoutes'
import { appStatesWithTag } from './appStates'
import { waitForMeasuredGlobalNavHeight } from './e2eHelpers'

type FocusObscurationProblem = {
	id: string
	kind:
		| 'missing-focused-element'
		| 'unresolved-focused-geometry'
		| 'focused-element-outside-viewport'
		| 'focused-element-obscured-by-global-nav'
	detail: string
}

async function readFocusObscurationProblem(
	page: Page
): Promise<FocusObscurationProblem | null> {
	return page.evaluate(() => {
		const focused = document.activeElement
		if (!(focused instanceof HTMLElement) || focused === document.body) {
			return {
				id: 'active-element',
				kind: 'missing-focused-element',
				detail: 'No non-body HTMLElement owns focus'
			}
		}

		const identify = (element: HTMLElement): string =>
			element.dataset.testid ??
			element.getAttribute('aria-label') ??
			(element.textContent.trim().slice(0, 40) || element.tagName.toLowerCase())
		const focusedRect = focused.getBoundingClientRect()
		if (focusedRect.width <= 0 || focusedRect.height <= 0) {
			return {
				id: identify(focused),
				kind: 'unresolved-focused-geometry',
				detail: `Focused element is ${focusedRect.width.toFixed(1)}×${focusedRect.height.toFixed(1)}px`
			}
		}
		if (
			focusedRect.left < 0 ||
			focusedRect.top < 0 ||
			focusedRect.right > document.documentElement.clientWidth ||
			focusedRect.bottom > document.documentElement.clientHeight
		) {
			return {
				id: identify(focused),
				kind: 'focused-element-outside-viewport',
				detail: `Focused bounds are ${focusedRect.left.toFixed(1)},${focusedRect.top.toFixed(1)}–${focusedRect.right.toFixed(1)},${focusedRect.bottom.toFixed(1)}px`
			}
		}

		const globalNav = document.querySelector<HTMLElement>(
			'[data-sticky-global-nav]'
		)
		if (!globalNav || globalNav.contains(focused)) return null
		const navRect = globalNav.getBoundingClientRect()
		if (navRect.width <= 0 || navRect.height <= 0) return null
		const intersects =
			focusedRect.left < navRect.right &&
			focusedRect.right > navRect.left &&
			focusedRect.top < navRect.bottom &&
			focusedRect.bottom > navRect.top
		if (!intersects) return null

		const overlapLeft = Math.max(focusedRect.left, navRect.left)
		const overlapRight = Math.min(focusedRect.right, navRect.right)
		const overlapTop = Math.max(focusedRect.top, navRect.top)
		const overlapBottom = Math.min(focusedRect.bottom, navRect.bottom)
		const samplePoints = [
			{ x: overlapLeft + 1, y: overlapTop + 1 },
			{ x: overlapRight - 1, y: overlapTop + 1 },
			{ x: overlapLeft + 1, y: overlapBottom - 1 },
			{ x: overlapRight - 1, y: overlapBottom - 1 },
			{
				x: (overlapLeft + overlapRight) / 2,
				y: (overlapTop + overlapBottom) / 2
			}
		]
		const obscured = samplePoints.some(({ x, y }) => {
			const topmost = document.elementFromPoint(x, y)
			return (
				topmost !== null &&
				topmost !== focused &&
				!focused.contains(topmost) &&
				!topmost.contains(focused)
			)
		})

		return obscured
			? {
					id: identify(focused),
					kind: 'focused-element-obscured-by-global-nav',
					detail: `Focused bounds ${focusedRect.top.toFixed(1)}–${focusedRect.bottom.toFixed(1)}px intersect navigation ${navRect.top.toFixed(1)}–${navRect.bottom.toFixed(1)}px`
				}
			: null
	})
}

async function assertFocusableElementsClearPersistentNavigation(
	page: Page,
	label: string
): Promise<void> {
	const focusables = page.locator(
		'main a[href], main button:not([disabled]), main input:not([disabled]), main select:not([disabled]), main textarea:not([disabled])'
	)
	const count = await focusables.count()
	expect(
		count,
		`${label} must expose a focusable main-content target`
	).toBeGreaterThan(0)

	for (let index = 0; index < count; index += 1) {
		const target = focusables.nth(index)
		if (!(await target.isVisible())) continue
		await target.focus()
		await target.evaluate((element) => {
			element.scrollIntoView({ block: 'center', inline: 'nearest' })
		})
		const problem = await readFocusObscurationProblem(page)
		expect(
			problem,
			`${label} focus target ${index} must remain visible`
		).toBeNull()
	}
}

test.describe('WCAG focus not obscured', () => {
	test.use({ viewport: { width: 320, height: 568 } })

	for (const route of appRoutes) {
		test(`${route.label} focus targets clear persistent navigation`, async ({
			page
		}) => {
			await page.emulateMedia({ reducedMotion: 'reduce' })
			await route.open(page)
			await waitForMeasuredGlobalNavHeight(page)
			await assertFocusableElementsClearPersistentNavigation(page, route.label)
		})
	}

	for (const state of appStatesWithTag('dialog')) {
		test(`${state.label} keeps focused dialog control visible`, async ({
			page
		}) => {
			await state.open(page)
			const problem = await readFocusObscurationProblem(page)
			expect(problem).toBeNull()
		})
	}

	test('scanner reports a focused control covered by persistent navigation', async ({
		page
	}) => {
		await page.goto('/')
		await page.evaluate(() => {
			const button = document.createElement('button')
			button.dataset.testid = 'obscured-focus-negative-fixture'
			button.textContent = 'Obscured focus fixture'
			button.style.cssText =
				'position:fixed;left:20px;bottom:20px;width:120px;height:44px;z-index:1'
			document.body.append(button)
			button.focus()
		})

		const fixture = page.getByTestId('obscured-focus-negative-fixture')
		await expect(fixture).toBeFocused()
		const fixtureAndNav = await page.evaluate(() => {
			const fixtureElement = document.querySelector<HTMLElement>(
				'[data-testid="obscured-focus-negative-fixture"]'
			)
			const nav = document.querySelector<HTMLElement>(
				'[data-sticky-global-nav]'
			)
			if (!fixtureElement || !nav)
				return { problem: 'missing-focus-negative-fixture' } as const
			const fixtureRect = fixtureElement.getBoundingClientRect()
			const navRect = nav.getBoundingClientRect()
			return {
				problem: null,
				intersects:
					fixtureRect.left < navRect.right &&
					fixtureRect.right > navRect.left &&
					fixtureRect.top < navRect.bottom &&
					fixtureRect.bottom > navRect.top
			} as const
		})
		expect(fixtureAndNav).toEqual({ problem: null, intersects: true })
		await expect(readFocusObscurationProblem(page)).resolves.toMatchObject({
			id: 'obscured-focus-negative-fixture',
			kind: 'focused-element-obscured-by-global-nav'
		})
	})
})
