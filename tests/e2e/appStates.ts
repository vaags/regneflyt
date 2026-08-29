import { expect, type Page } from '@playwright/test'
import { startQuiz, submitEmptyAnswer } from './e2eHelpers'

export type AppStateTag =
	'dialog' | 'validation' | 'expanded-navigation' | 'timed' | 'unlimited'

export type AppState = {
	/** Stable label used in focused evidence titles and failure messages. */
	label: string
	/** Capabilities represented by this state; specs select only relevant states. */
	tags: readonly [AppStateTag, ...AppStateTag[]]
	/** Opens the state and waits until its defining UI is rendered. */
	open: (page: Page) => Promise<void>
}

/**
 * Canonical transient/configured states. Keep routes in appRoutes; this registry
 * prevents expensive route sweeps from multiplying every dynamic combination.
 */
export const appStates: readonly [AppState, ...AppState[]] = [
	{
		label: 'unlimited quiz with expanded navigation',
		tags: ['unlimited', 'expanded-navigation'],
		open: async (page: Page): Promise<void> => {
			await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })
			await expect(page.getByTestId('numpad-next')).toBeVisible()
		}
	},
	{
		label: 'empty-answer validation over expanded navigation',
		tags: ['unlimited', 'validation', 'expanded-navigation'],
		open: async (page: Page): Promise<void> => {
			await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })
			await submitEmptyAnswer(page)
			await expect(
				page.getByTestId('puzzle-answer-validation-toast')
			).toBeVisible()
		}
	},
	{
		label: 'complete-round confirmation dialog',
		tags: ['unlimited', 'dialog'],
		open: async (page: Page): Promise<void> => {
			await startQuiz(page, { url: '/?duration=0', waitForPuzzle: true })
			await page.getByTestId('btn-complete-quiz').click()
			await expect(page.getByTestId('complete-dialog-heading')).toBeVisible()
		}
	},
	{
		label: 'timed quiz',
		tags: ['timed', 'expanded-navigation'],
		open: async (page: Page): Promise<void> => {
			await startQuiz(page, { url: '/?duration=1', waitForPuzzle: true })
		}
	}
]

export function appStatesWithTag(tag: AppStateTag): readonly AppState[] {
	return appStates.filter((state) => state.tags.includes(tag))
}
