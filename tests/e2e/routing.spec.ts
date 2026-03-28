import { expect, test, type Page } from '@playwright/test'
import {
	ADAPTIVE_PROFILES_KEY,
	readPuzzle,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForSettingsRouteHydration,
	waitForPuzzle
} from './e2eHelpers'

/**
 * Complete a quiz: go to menu, start, solve one puzzle, finish.
 * Returns on the /results page.
 */
async function completeOneQuiz(page: Page) {
	await page.goto('/?duration=0')
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
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})
}

async function startConfiguredQuiz(page: Page) {
	await page.goto('/?duration=0&operator=0&difficulty=1')
	await waitForApp(page)
	await startQuiz(page)
	await waitForPuzzle(page)
}

async function openSettingsFromMenu(page: Page) {
	await page.getByTestId('btn-settings').click()
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
		await waitForPuzzle(page, 7_000)

		expect(page.url()).toContain('/quiz')
	})

	test('/results redirects to / when no results exist', async ({ page }) => {
		await page.goto('/results')
		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})

		const url = new URL(page.url())
		expect(url.pathname).toBe('/')
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

		await Promise.all([
			page.waitForLoadState('load'),
			page.getByTestId('btn-delete-progress-yes').click()
		])

		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)
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

	test('navigating to settings from quiz requires quit confirmation', async ({
		page
	}) => {
		await startConfiguredQuiz(page)

		await page.getByTestId('btn-settings').click()
		await dismissQuitDialog(page)
		expect(new URL(page.url()).pathname).toBe('/quiz')

		await page.getByTestId('btn-settings').click()
		await confirmQuitDialog(page)

		await waitForSettingsRouteHydration(page)
		expect(new URL(page.url()).pathname).toBe('/settings')
	})

	test('non-header navigation to settings from quiz requires quit confirmation', async ({
		page
	}) => {
		await startConfiguredQuiz(page)
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
		await startConfiguredQuiz(page)

		await page.getByTestId('link-logo-menu').click()
		await confirmQuitDialog(page)

		await expect(page.getByTestId('heading-select-operator')).toBeVisible({
			timeout: 5_000
		})
		expect(new URL(page.url()).pathname).toBe('/')
	})

	test('header actions persist across route changes', async ({ page }) => {
		await page.addInitScript((key) => {
			window.localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
		}, ADAPTIVE_PROFILES_KEY)

		await page.goto('/?duration=0')
		await waitForApp(page)

		// Header skill button visible on menu
		const skillButton = page.getByRole('button', { name: /\d+%/ })
		await expect(skillButton).toBeVisible()

		// Settings button visible on menu
		await expect(page.getByTestId('btn-settings')).toBeVisible()

		// Start quiz
		await startQuiz(page)
		await waitForPuzzle(page)

		// Header still visible on quiz
		await expect(skillButton).toBeVisible()
		await expect(page.getByTestId('btn-settings')).toBeVisible()

		// Complete quiz
		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))
		await waitForPuzzle(page)
		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
			timeout: 10_000
		})
		await page.getByTestId('btn-complete-yes').click()
		await expect(page.getByTestId('heading-results')).toBeVisible({
			timeout: 10_000
		})

		// Header still visible on results
		await expect(skillButton).toBeVisible()
		await expect(page.getByTestId('btn-settings')).toBeVisible()
	})
})
