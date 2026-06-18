import { expect, test, type Page } from '@playwright/test'
import {
	readPuzzle,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForSettingsRouteHydration,
	waitForPuzzle,
	waitForResults
} from './e2eHelpers'

const DURATION_ZERO_QUERY = '/?duration=0'
const CONFIGURED_MENU_QUERY = '/?duration=0&operator=0&difficulty=1'

/**
 * Complete a quiz: go to menu, start, solve one puzzle, finish.
 * Returns on the /results page.
 */
async function completeOneQuiz(page: Page) {
	await page.goto(DURATION_ZERO_QUERY)
	await waitForApp(page)
	await startQuiz(page)
	await waitForPuzzle(page)

	const puzzle = await readPuzzle(page)
	await submitAnswer(page, solvePuzzle(puzzle))
	await waitForPuzzle(page)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
		timeout: 10_000
	})
	await page.getByTestId('btn-complete-yes').click()
	await waitForResults(page)
}

async function startConfiguredQuizFromMenu(page: Page) {
	await page.goto(CONFIGURED_MENU_QUERY)
	await waitForApp(page)
	await startQuiz(page)
	await waitForPuzzle(page)
}

async function openSettingsFromMenu(page: Page) {
	await page.getByTestId('btn-global-settings').click()
	await waitForSettingsRouteHydration(page)
}

async function expectQuitDialog(page: Page) {
	await expect(page.getByTestId('quit-dialog-heading')).toBeVisible({
		timeout: 5_000
	})
}

async function confirmQuitDialog(page: Page) {
	await expectQuitDialog(page)
	await page.getByTestId('btn-cancel-yes').click()
}

async function dismissQuitDialog(page: Page) {
	await expectQuitDialog(page)
	await page.getByTestId('btn-cancel-no').click()
	await waitForPuzzle(page)
}

async function addNonHeaderSettingsLink(page: Page) {
	await page.evaluate(() => {
		const link = document.createElement('a')
		link.href = '/settings'
		link.textContent = 'Settings'
		link.dataset.testid = 'link-non-header-settings'
		link.style.position = 'fixed'
		link.style.top = '0'
		link.style.left = '0'
		link.style.zIndex = '9999'
		document.body.appendChild(link)
	})

	return page.getByTestId('link-non-header-settings')
}

test.describe('route navigation', () => {
	test('menu navigates to /quiz on start', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)
		await startQuiz(page)
		await waitForPuzzle(page)

		expect(page.url()).toContain('/quiz')
	})

	test('quiz navigates to /results on completion', async ({ page }) => {
		await completeOneQuiz(page)

		expect(page.url()).toContain('/results')
	})

	test('results navigates to / on menu button', async ({ page }) => {
		await completeOneQuiz(page)

		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible()

		const url = new URL(page.url())
		expect(url.pathname).toBe('/')
	})

	test('results navigates to /quiz on start button', async ({ page }) => {
		await completeOneQuiz(page)

		await page.getByTestId('btn-start').click()
		await expect(page).toHaveURL(/\/quiz/, { timeout: 10_000 })
		await waitForPuzzle(page, 10_000)

		expect(page.url()).toContain('/quiz')
	})

	test('/results renders empty state when no results exist', async ({
		page
	}) => {
		await page.goto('/results')
		await waitForResults(page)
		await expect(page.getByTestId('heading-puzzles')).toHaveCount(0)

		const url = new URL(page.url())
		expect(url.pathname).toBe('/results')
	})

	test('/results is deep-linkable after completing a quiz', async ({
		page
	}) => {
		await completeOneQuiz(page)

		// Navigate away to menu
		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible()

		// Navigate directly to /results
		await page.goto('/results')
		await expect(page.getByTestId('heading-results')).toBeVisible()
		await expect(page.getByTestId('icon-correct').first()).toBeVisible()
	})

	test('/quiz is deep-linkable with query params', async ({ page }) => {
		await page.goto(
			'/quiz?duration=0&operator=0&difficulty=1&allowNegativeAnswers=false'
		)
		await waitForPuzzle(page)

		const puzzle = await readPuzzle(page)
		expect(puzzle.operator).toBe('+')
	})

	test('quiz abort navigates back to menu', async ({ page }) => {
		await page.goto(
			'/quiz?duration=0&operator=0&difficulty=1&allowNegativeAnswers=false'
		)
		await waitForPuzzle(page)

		await page.getByTestId('btn-cancel').click()
		await page.getByTestId('btn-cancel-yes').click()

		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
		const url = new URL(page.url())
		expect(url.pathname).toBe('/')
	})

	test('show results from menu navigates to /results', async ({ page }) => {
		await completeOneQuiz(page)

		// Go back to menu
		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible()

		// Click show results
		await page.getByTestId('btn-results').click()
		await expect(page.getByTestId('heading-results')).toBeVisible()

		expect(page.url()).toContain('/results')
	})

	test('settings button navigates to /settings', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)
		await openSettingsFromMenu(page)

		const url = new URL(page.url())
		expect(url.pathname).toBe('/settings')
	})

	test('settings bottom menu button navigates to / and preserves quiz params', async ({
		page
	}) => {
		await page.goto(CONFIGURED_MENU_QUERY)
		await waitForApp(page)
		await openSettingsFromMenu(page)

		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})

		const url = new URL(page.url())
		expect(url.pathname).toBe('/')
		expect(url.searchParams.get('duration')).toBe('0')
		expect(url.searchParams.get('operator')).toBe('0')
		expect(url.searchParams.get('difficulty')).toBe('1')
	})

	test('settings start button navigates to /quiz and preserves quiz params', async ({
		page
	}) => {
		await page.goto(CONFIGURED_MENU_QUERY)
		await waitForApp(page)
		await openSettingsFromMenu(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const url = new URL(page.url())
		expect(url.pathname).toBe('/quiz')
		expect(url.searchParams.get('duration')).toBe('0')
		expect(url.searchParams.get('operator')).toBe('0')
		expect(url.searchParams.get('difficulty')).toBe('1')
	})

	test('settings locale selection persists across round-trip navigation', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)
		await openSettingsFromMenu(page)

		const currentLocale = await page
			.locator('input[name="settings-language"]:checked')
			.inputValue()
		const nextLocale = currentLocale === 'en' ? 'nb' : 'en'

		await page.getByTestId(`settings-language-${nextLocale}`).check()
		await expect(
			page.locator(`input[name="settings-language"][value="${nextLocale}"]`)
		).toBeChecked()

		await page.getByTestId('btn-menu').click()
		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const settingsButton = page.getByTestId('btn-global-settings')
		await settingsButton.click()
		await confirmQuitDialog(page)
		await waitForSettingsRouteHydration(page)

		await expect(
			page.locator(`input[name="settings-language"][value="${nextLocale}"]`)
		).toBeChecked()
	})

	test('delete progress dialog works on settings route', async ({ page }) => {
		await page.goto('/')
		await waitForApp(page)
		await openSettingsFromMenu(page)
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)

		await page.getByTestId('btn-delete-progress').click()
		await expect(
			page.getByTestId('delete-progress-dialog-heading')
		).toBeVisible({
			timeout: 5_000
		})

		await page.getByTestId('btn-delete-progress-no').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await page.getByTestId('btn-delete-progress').click()
		await expect(
			page.getByTestId('delete-progress-dialog-heading')
		).toBeVisible({
			timeout: 5_000
		})

		await page.getByTestId('btn-delete-progress-yes').click()

		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)
		await expect(page.getByTestId('alert-progress-cleared')).toBeVisible()
	})

	test('direct /settings deep-link supports interactions after hydration', async ({
		page
	}) => {
		await page.goto('/settings')
		await waitForSettingsRouteHydration(page)

		await page.getByTestId('btn-delete-progress').click()
		await expect(
			page.getByTestId('delete-progress-dialog-heading')
		).toBeVisible({
			timeout: 5_000
		})

		await page.getByTestId('btn-delete-progress-no').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)
	})

	test('settings quick action stays visible on quiz route and requires confirmation', async ({
		page
	}) => {
		await startConfiguredQuizFromMenu(page)

		const settingsButton = page.getByTestId('btn-global-settings')
		await expect(settingsButton).toBeVisible()

		await settingsButton.click()
		await dismissQuitDialog(page)
		expect(new URL(page.url()).pathname).toBe('/quiz')

		await settingsButton.click()
		await confirmQuitDialog(page)

		await waitForSettingsRouteHydration(page)
		expect(new URL(page.url()).pathname).toBe('/settings')
	})

	test('repeated settings actions during quit confirmation keep a single pending destination', async ({
		page
	}) => {
		await startConfiguredQuizFromMenu(page)

		const settingsButton = page.getByTestId('btn-global-settings')
		await expect(settingsButton).toBeVisible()

		await settingsButton.click()
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible({
			timeout: 5_000
		})

		await settingsButton.dispatchEvent('click')

		await expect(page.getByTestId('quit-dialog-heading')).toHaveCount(1)
		await page.getByTestId('btn-cancel-yes').click()

		await waitForSettingsRouteHydration(page)
		expect(new URL(page.url()).pathname).toBe('/settings')
	})

	test('repeated keyboard settings actions during quit confirmation keep a single pending destination', async ({
		page
	}) => {
		await startConfiguredQuizFromMenu(page)

		const settingsButton = page.getByTestId('btn-global-settings')
		await expect(settingsButton).toBeVisible()

		await settingsButton.focus()
		await settingsButton.press('Enter')
		await expect(page.getByTestId('quit-dialog-heading')).toBeVisible({
			timeout: 5_000
		})

		await settingsButton.evaluate((node) => {
			const button = node as HTMLButtonElement

			button.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'Enter',
					bubbles: true,
					cancelable: true
				})
			)
			button.dispatchEvent(
				new KeyboardEvent('keyup', {
					key: 'Enter',
					bubbles: true,
					cancelable: true
				})
			)
			button.click()
		})

		await expect(page.getByTestId('quit-dialog-heading')).toHaveCount(1)
		await page.getByTestId('btn-cancel-yes').click()

		await waitForSettingsRouteHydration(page)
		expect(new URL(page.url()).pathname).toBe('/settings')
	})

	test('navigating to settings from quiz requires quit confirmation via direct link', async ({
		page
	}) => {
		await startConfiguredQuizFromMenu(page)
		const nonHeaderSettingsLink = await addNonHeaderSettingsLink(page)

		await nonHeaderSettingsLink.click()
		await dismissQuitDialog(page)
		expect(new URL(page.url()).pathname).toBe('/quiz')

		await nonHeaderSettingsLink.click()
		await confirmQuitDialog(page)

		await waitForSettingsRouteHydration(page)
		expect(new URL(page.url()).pathname).toBe('/settings')
	})

	test('logo menu link from quiz requires quit confirmation', async ({
		page
	}) => {
		await startConfiguredQuizFromMenu(page)

		await page.getByTestId('link-logo-menu').click()
		await confirmQuitDialog(page)

		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
		expect(new URL(page.url()).pathname).toBe('/')
	})

	test('header actions persist across route changes', async ({ page }) => {
		await page.goto(DURATION_ZERO_QUERY)
		await waitForApp(page)

		// Sticky settings button visible on menu
		await expect(page.getByTestId('btn-global-settings')).toBeVisible()

		// Start quiz
		await startQuiz(page)
		await waitForPuzzle(page)

		// Sticky global nav remains visible on quiz route
		await expect(page.getByTestId('btn-menu')).toBeVisible()
		await expect(page.getByTestId('btn-results')).toBeVisible()
		await expect(page.getByTestId('btn-global-settings')).toBeVisible()

		// Complete quiz
		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))
		await waitForPuzzle(page)
		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
			timeout: 10_000
		})
		await page.getByTestId('btn-complete-yes').click()
		await waitForResults(page)

		await expect(page.getByTestId('btn-global-settings')).toBeVisible()
	})
})
