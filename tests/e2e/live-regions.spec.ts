import { expect, test, type Page } from '@playwright/test'
import { appRoutes } from './appRoutes'
import { cleanupServiceWorkerTestState } from './fixtures'
import { installServiceWorkerMock } from './serviceWorkerMock'
import { submitEmptyAnswer, waitForApp, waitForPuzzle } from './e2eHelpers'

/*
 * `assertive` interrupts whatever the screen reader is currently saying, so it
 * is reserved for errors and blocking state. `role="alert"` carries the same
 * assertive politeness, so it is swept together with the explicit attribute.
 * A matching `no-restricted-syntax` ban lives in `eslint.config.js`; this sweep
 * covers the rendered DOM, which the lint rule cannot see (component props,
 * conditional attributes).
 *
 * Regions rendered by `ValidationMessageComponent` carry `data-validation-message`
 * and are exempt by construction rather than by name.
 *
 * Scope: the route sweep visits resting states only. It never provokes an error
 * toast, a storage failure, or a validation error, so it proves that no stray
 * interrupting region exists. Sanctioned validation feedback has a dedicated
 * stateful test below.
 */

/**
 * A genuine failure the user must be interrupted for. Listed defensively: the
 * sweep never provokes a storage write error, so this alert is not in the DOM
 * during any run below.
 */
const INTERRUPTING_ALLOWED_TESTIDS: readonly string[] = ['storage-write-alert']

/** SvelteKit injects its own route-change announcer; it is not ours to change. */
const INTERRUPTING_ALLOWED_IDS: readonly string[] = ['svelte-announcer']

async function findInterruptingRegions(page: Page): Promise<string[]> {
	return page.evaluate(
		({ allowedTestIds, allowedIds }) =>
			[...document.querySelectorAll('[aria-live="assertive"], [role="alert"]')]
				.filter(
					(element) =>
						!element.hasAttribute('data-validation-message') &&
						!allowedTestIds.includes(
							element.getAttribute('data-testid') ?? ''
						) &&
						!allowedIds.includes(element.id)
				)
				.map((element) => element.outerHTML.slice(0, 120)),
		{
			allowedTestIds: INTERRUPTING_ALLOWED_TESTIDS,
			allowedIds: INTERRUPTING_ALLOWED_IDS
		}
	)
}

/*
 * `role="status"`/`role="alert"` are implicitly atomic, so a control nested in a
 * live region has its label read out on every announcement. The lint bans cannot
 * catch it because the fault is the nesting, not the attribute.
 */
async function findLiveRegionsWrappingControls(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		[
			...document.querySelectorAll(
				'[aria-live], [role="status"], [role="alert"], [role="log"]'
			)
		]
			.filter((element) =>
				element.querySelector(
					'a[href], button, input, select, textarea, [tabindex], [contenteditable]'
				)
			)
			.map((element) => element.outerHTML.slice(0, 120))
	)
}

test.describe('live regions', () => {
	for (const route of appRoutes) {
		test(`${route.label} screen announces safely`, async ({ page }) => {
			await route.open(page)

			expect(await findInterruptingRegions(page)).toEqual([])
			expect(await findLiveRegionsWrappingControls(page)).toEqual([])
		})
	}

	test('the update notification does not interrupt', async ({
		page,
		context
	}) => {
		// No route sweep can reach it, so it needs the service worker mock to render.
		await installServiceWorkerMock(page, true)
		await page.goto('/')
		await waitForApp(page)
		await expect(page.getByTestId('update-notification-alert')).toBeVisible()

		try {
			expect(await findInterruptingRegions(page)).toEqual([])
			expect(await findLiveRegionsWrappingControls(page)).toEqual([])
		} finally {
			await cleanupServiceWorkerTestState(page, context)
		}
	})

	test('gameplay values are not announced on every tick', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		// Throws rather than returning false when the element is gone, so deleting
		// the target cannot turn the assertion into a pass. `role` counts too: a
		// `role="status"` wrapper announces just as much as the explicit attribute.
		const insideLiveRegion = async (testId: string): Promise<boolean> => {
			await expect(page.getByTestId(testId)).toBeAttached()

			return page.evaluate((id) => {
				const element = document.querySelector(`[data-testid="${id}"]`)
				if (!element) throw new Error(`No element with data-testid="${id}"`)

				return (
					element.closest(
						'[aria-live], [role="status"], [role="alert"], [role="log"]'
					) != null
				)
			}, testId)
		}

		expect(await insideLiveRegion('quiz-timer'), 'ticking timer').toBe(false)
		expect(
			await insideLiveRegion('quiz-star-region'),
			'running star total'
		).toBe(false)

		// A live region inserted at the same time as its content is not announced
		// by most screen readers, so the region must already exist while empty.
		for (const testId of [
			'quiz-countdown-announcer',
			'puzzle-incorrect-announcer'
		]) {
			const announcer = page.getByTestId(testId)
			await expect(announcer).toHaveAttribute('aria-live', 'polite')
			await expect(announcer).toBeEmpty()
		}
	})

	test('empty-answer feedback uses one assertive toast and a non-live descriptor', async ({
		page
	}) => {
		await page.goto('/?duration=0')
		await waitForApp(page)
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		await submitEmptyAnswer(page)

		const toast = page.getByTestId('puzzle-answer-validation-toast')
		const descriptor = page.getByTestId('puzzle-answer-validation')
		const answer = page.getByTestId('puzzle-answer-value')
		const numpad = page.getByRole('group', {
			name: /tall|number|pavé|ziffer|teclado/i
		})
		await expect(toast).toBeVisible()
		await expect(toast.getByRole('alert')).toHaveCount(1)
		await expect(descriptor).not.toHaveAttribute('aria-live')
		await expect(descriptor).not.toHaveAttribute('role')
		await expect(answer).toHaveAttribute('aria-invalid', 'true')
		await expect(answer).toHaveAttribute(
			'aria-describedby',
			'puzzle-answer-validation'
		)
		await expect(numpad).toHaveAttribute(
			'aria-describedby',
			'puzzle-answer-validation'
		)

		const matchingAlerts = page.locator(
			'[aria-live="assertive"]:not(#svelte-announcer), [role="alert"]'
		)
		await expect(matchingAlerts).toHaveCount(1)
		expect(await findLiveRegionsWrappingControls(page)).toEqual([])
	})
})
