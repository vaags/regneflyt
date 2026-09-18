import { expect, test, type Page } from '@playwright/test'
import {
	msg,
	openConfiguredMenu,
	startQuiz,
	waitForApp,
	waitForPuzzle,
	waitForResults,
	waitForSettingsRouteHydration
} from './e2eHelpers'
import type { Locale } from '../../src/lib/paraglide/runtime.js'
import {
	toast_copy_link_deterministic_success,
	toast_copy_link_success
} from '../../src/lib/paraglide/messages.js'

const TOAST_TEST_LOCALE: Locale = 'nb'

test.describe('global nav', () => {
	test('marks menu as active on home and can navigate to settings/results', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		await expect(page.getByTestId('btn-menu')).toHaveAttribute(
			'aria-current',
			'page'
		)
		await expect(page.getByTestId('btn-results')).not.toHaveAttribute(
			'aria-current'
		)
		await expect(page.getByTestId('btn-global-settings')).not.toHaveAttribute(
			'aria-current'
		)

		await page.getByTestId('btn-global-settings').click()
		await waitForSettingsRouteHydration(page)
		expect(new URL(page.url()).pathname).toBe('/settings')
		await expect(page.getByTestId('btn-global-settings')).toHaveAttribute(
			'aria-current',
			'page'
		)

		await page.getByTestId('btn-results').click()
		await waitForResults(page)
		await expect(page.getByTestId('btn-results')).toHaveAttribute(
			'aria-current',
			'page'
		)
	})

	test('settings menu button returns to home and preserves quiz params', async ({
		page
	}) => {
		await page.goto('/?duration=0&operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await waitForSettingsRouteHydration(page)

		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
		await expect(page.getByTestId('btn-menu')).toHaveAttribute(
			'aria-current',
			'page'
		)

		const url = new URL(page.url())
		expect(url.pathname).toBe('/')
		expect(url.searchParams.get('duration')).toBe('0')
		expect(url.searchParams.get('operator')).toBe('0')
		expect(url.searchParams.get('difficulty')).toBe('1')
	})

	test('results nav button is active after finishing a short quiz', async ({
		page
	}) => {
		await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })

		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
			timeout: 10_000
		})
		await page.getByTestId('btn-complete-yes').click()

		await waitForResults(page)
		await expect(page.getByTestId('btn-results')).toHaveAttribute(
			'aria-current',
			'page'
		)
		await expect(page.getByTestId('btn-menu')).not.toHaveAttribute(
			'aria-current'
		)
	})

	test('global nav remains available in quiz mode and can leave quiz', async ({
		page
	}) => {
		await startQuiz(page, { url: '/?duration=0&operator=0&difficulty=1' })
		await waitForPuzzle(page)

		await expect(page.getByTestId('btn-menu')).toBeVisible()
		await expect(page.getByTestId('btn-results')).toBeVisible()
		await expect(page.getByTestId('btn-global-settings')).toBeVisible()

		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible({
			timeout: 5_000
		})
		await page.getByTestId('btn-cancel-yes').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
	})

	test('copy link actions show success toasts from global nav', async ({
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

		const successToastMessage = page.getByTestId('toast-message')
		const politeAnnouncer = page.getByTestId('toast-live-region')

		await page.getByTestId('btn-copy-link').click()
		await expect(successToastMessage).toBeVisible()
		await expect(successToastMessage).toHaveText(expectedPrimaryToast)
		await expect(politeAnnouncer).toHaveText(expectedPrimaryToast)

		await page.getByTestId('btn-copy-link-toggle').click()
		await page.getByTestId('btn-copy-link-secondary').click()
		await expect(successToastMessage).toBeVisible()
		await expect(successToastMessage).toHaveText(expectedSecondaryToast)
		await expect(politeAnnouncer).toHaveText(expectedSecondaryToast)
		expect(expectedSecondaryToast).not.toBe(expectedPrimaryToast)
	})

	test('preserves panel surface, form inset, and share icon contracts', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/')
		await waitForApp(page)

		const contract = await page.evaluate(() => {
			const navPanel = document.querySelector<HTMLElement>(
				'[data-testid="global-nav"] [data-panel-surface]'
			)
			const menuPanel = document.querySelector<HTMLElement>(
				'#main-content [data-panel-surface]'
			)
			const heading = document.querySelector<HTMLElement>(
				'#main-content [data-panel-surface] h2 span'
			)
			const content = document.querySelector<HTMLElement>(
				'#main-content [data-panel-surface] > div:last-child'
			)
			const shareIcon = document.querySelector<SVGElement>(
				'[data-testid="btn-copy-link"] svg'
			)
			const shareControl = document.querySelector<HTMLElement>(
				'[data-testid="btn-copy-link"]'
			)?.parentElement
			const firstOption = document
				.querySelector<HTMLInputElement>('[data-testid="operator-0"]')
				?.closest('label')
			const firstControl = firstOption?.querySelector<HTMLInputElement>('input')
			if (
				navPanel === null ||
				menuPanel === null ||
				heading === null ||
				content === null ||
				shareIcon === null ||
				shareControl == null ||
				firstOption == null ||
				firstControl === null ||
				firstControl === undefined
			) {
				return {
					problem: 'missing-global-nav-visual-contract-element'
				} as const
			}

			const navStyle = getComputedStyle(navPanel)
			const panelStyle = getComputedStyle(menuPanel)
			const headingStyle = getComputedStyle(heading)
			const contentStyle = getComputedStyle(content)
			const shareRect = shareIcon.getBoundingClientRect()
			const contentRect = content.getBoundingClientRect()
			const optionRect = firstOption.getBoundingClientRect()
			const controlRect = firstControl.getBoundingClientRect()

			return {
				navBorder: navStyle.borderTopColor,
				panelBorder: panelStyle.borderTopColor,
				panelPaddingBlock: panelStyle.paddingBlockStart,
				panelPaddingInline: panelStyle.paddingInlineStart,
				headingLineHeight: headingStyle.lineHeight,
				contentMargin: contentStyle.marginBlockStart,
				panelShadow: panelStyle.boxShadow,
				optionInset: optionRect.left - contentRect.left,
				controlInset: controlRect.left - optionRect.left,
				shareWidth: shareRect.width,
				shareHeight: shareRect.height,
				shareColor: getComputedStyle(shareIcon).color,
				shareBorderColor: getComputedStyle(shareControl).borderTopColor
			}
		})
		if ('problem' in contract) throw new Error(contract.problem)

		expect(contract.navBorder).toBe(contract.panelBorder)
		expect(contract.panelPaddingBlock).toBe('28px')
		expect(contract.panelPaddingInline).toBe('32px')
		expect(contract.headingLineHeight).toBe('40px')
		expect(contract.contentMargin).toBe('24px')
		expect(contract.panelShadow).toBe('rgba(0, 0, 0, 0.25) 0px 25px 50px -12px')
		expect(contract.optionInset).toBe(0)
		expect(contract.controlInset).toBe(0)
		expect(contract.shareWidth).toBe(20)
		expect(contract.shareHeight).toBe(20)
		expect(contract.shareColor).toBe('rgb(231, 229, 228)')
		expect(contract.shareBorderColor).toBe('rgb(168, 162, 158)')
	})

	test('copy link menu light-dismisses without restoring toggle focus', async ({
		page
	}) => {
		await openConfiguredMenu(page, 'operator=0&difficulty=0')

		const copyToggle = page.getByTestId('btn-copy-link-toggle')
		const copyMenuItem = page.getByTestId('btn-copy-link-secondary')
		await copyToggle.click()
		await expect(copyMenuItem).toBeVisible()

		const outsidePoint = await page.evaluate(() => {
			const menu = document.querySelector('[role="menu"]')
			const toggle = document.querySelector(
				'[data-testid="btn-copy-link-toggle"]'
			)
			if (!(menu instanceof HTMLElement) || !(toggle instanceof HTMLElement)) {
				throw new Error('Copy-link menu and toggle must be present')
			}

			const isOutside = (x: number, y: number) => {
				const contains = (element: HTMLElement) => {
					const rect = element.getBoundingClientRect()
					return (
						x >= rect.left &&
						x <= rect.right &&
						y >= rect.top &&
						y <= rect.bottom
					)
				}
				return !contains(menu) && !contains(toggle)
			}

			for (const point of [
				{ x: 8, y: 8 },
				{ x: window.innerWidth - 8, y: 8 },
				{ x: 8, y: window.innerHeight - 8 },
				{ x: window.innerWidth - 8, y: window.innerHeight - 8 }
			]) {
				if (isOutside(point.x, point.y)) return point
			}

			throw new Error(
				'No viewport corner is outside the copy-link menu and toggle'
			)
		})

		await page.mouse.click(outsidePoint.x, outsidePoint.y)
		await expect(copyMenuItem).not.toBeVisible()
		await expect(copyToggle).not.toBeFocused()
	})
})

async function stubClipboardWriteText(page: Page) {
	await page.addInitScript(() => {
		const clipboardStub = {
			writeText: () => Promise.resolve(undefined)
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
