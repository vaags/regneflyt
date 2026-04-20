import { expect, test, type Page } from '@playwright/test'
import {
	openConfiguredMenu,
	startQuiz,
	waitForApp,
	waitForPuzzle,
	waitForSettingsRouteHydration
} from './e2eHelpers'
import {
	overwriteGetLocale,
	type Locale
} from '../../src/lib/paraglide/runtime.js'
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
		await expect(page.getByTestId('btn-global-settings')).toHaveAttribute(
			'aria-current',
			'page'
		)

		await page.getByTestId('btn-results').click()
		await expect(page.getByTestId('heading-results')).toBeVisible()
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

		await expect(page.getByTestId('heading-results')).toBeVisible({
			timeout: 10_000
		})
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

function msg(fn: () => string, locale: Locale): string {
	overwriteGetLocale(() => locale)
	return fn()
}
