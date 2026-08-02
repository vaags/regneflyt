import { expect, type Page } from '@playwright/test'
import {
	openConfiguredMenu,
	readPuzzle,
	solvePuzzle,
	submitAnswer,
	waitForApp,
	waitForPuzzle,
	waitForResults,
	waitForSettingsRouteHydration
} from './e2eHelpers'

export type AppRoute = {
	/** Stable label used in test titles and failure messages. */
	label: string
	/** Navigates to the route and waits until it is interactive. */
	open: (page: Page) => Promise<void>
}

/**
 * Every user-reachable route. Accessibility sweeps iterate this registry, so a
 * new route that is not registered here ships without a11y coverage. The tuple
 * type keeps the sweeps from silently generating no tests if it is emptied.
 */
export const appRoutes: readonly [AppRoute, ...AppRoute[]] = [
	{
		label: 'menu',
		open: async (page: Page): Promise<void> => {
			await openConfiguredMenu(page)
		}
	},
	{
		label: 'quiz',
		open: async (page: Page): Promise<void> => {
			await openConfiguredMenu(page)
			await page.getByTestId('btn-start').click()
			await waitForPuzzle(page)
		}
	},
	{
		label: 'results',
		open: async (page: Page): Promise<void> => {
			await page.goto('/?duration=0&operator=0&difficulty=1')
			await waitForApp(page)
			await page.getByTestId('btn-start').click()
			await waitForPuzzle(page)

			// Answered wrong on purpose: a perfect score hides the answer-key toggle,
			// which would then be invisible to every sweep that iterates this list.
			const puzzle = await readPuzzle(page)
			await submitAnswer(page, solvePuzzle(puzzle) + 1)
			await waitForPuzzle(page)

			await page.getByTestId('btn-complete-quiz').click()
			await expect(page.getByTestId('complete-dialog-heading')).toBeVisible()
			await page.getByTestId('btn-complete-yes').click()
			await waitForResults(page)
		}
	},
	{
		label: 'custom difficulty menu',
		open: async (page: Page): Promise<void> => {
			// operator=4 is "all operators" and difficulty=0 is custom, which is the
			// only combination that renders every per-operator configuration panel.
			await openConfiguredMenu(page, 'operator=4&difficulty=0')
			await expect(page.getByTestId('custom-difficulty-settings')).toBeVisible()
		}
	},
	{
		label: 'settings',
		open: async (page: Page): Promise<void> => {
			await page.goto('/settings')
			await waitForSettingsRouteHydration(page)
		}
	},
	{
		label: 'error',
		open: async (page: Page): Promise<void> => {
			// waitForApp is menu-only, so the error page needs its own marker.
			await page.goto('/this-route-does-not-exist')
			await expect(page.getByTestId('error-heading')).toBeVisible()
		}
	}
]
