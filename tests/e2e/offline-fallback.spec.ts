import { expect, test, type Page } from '@playwright/test'
import { cleanupServiceWorkerTestState } from './fixtures'
import {
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'
import { usesProductionE2eServer } from './e2eServerMode'

// This test needs service workers to verify offline support.
// Service workers are not available in dev mode, only in production builds.
// eslint-disable-next-line playwright/no-skipped-test -- service workers require a production build; test is intentionally skipped in dev mode
test.skip(
	!usesProductionE2eServer,
	'service workers require a production build'
)
// eslint-disable-next-line playwright/no-skipped-test -- WebKit cannot load lazy quiz resources from a service-worker cache while Playwright forces the context offline
test.skip(
	({ browserName }) => browserName === 'webkit',
	'WebKit offline cache limitation'
)
test.use({ contextOptions: { serviceWorkers: 'allow' } })

test.afterEach(async ({ page, context }) => {
	await cleanupServiceWorkerTestState(page, context)
})

async function waitForServiceWorkerControl(page: Page) {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const initiallyControlled = await page.evaluate(async () => {
				if (!('serviceWorker' in navigator)) {
					throw new Error('Service worker is not supported in this environment')
				}

				await navigator.serviceWorker.ready
				return navigator.serviceWorker.controller !== null
			})

			if (!initiallyControlled) {
				await page.reload({ waitUntil: 'domcontentloaded' })
			}

			await expect
				.poll(() =>
					page.evaluate(() => navigator.serviceWorker.controller !== null)
				)
				.toBe(true)
			return
		} catch (error) {
			if (
				!(error instanceof Error) ||
				!isRecoverableServiceWorkerNavigationError(error)
			) {
				throw error
			}

			await page.waitForLoadState('domcontentloaded')
		}
	}

	throw new Error(
		'Service worker control did not settle after activation reload'
	)
}

function isRecoverableServiceWorkerNavigationError(error: Error): boolean {
	return [
		'Execution context was destroyed',
		'net::ERR_ABORTED',
		'NS_BINDING_ABORTED',
		'WebKit encountered an internal error'
	].some((message) => error.message.includes(message))
}

async function reloadOfflinePage(page: Page): Promise<void> {
	try {
		await page.reload({ waitUntil: 'domcontentloaded' })
	} catch (error) {
		if (
			!(error instanceof Error) ||
			!isRecoverableServiceWorkerNavigationError(error)
		) {
			throw error
		}
	}

	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
}

test('supports starting a quiz while offline after initial load', async ({
	page,
	context
}) => {
	await page.goto('/?duration=0')
	await waitForApp(page)
	await waitForServiceWorkerControl(page)
	await waitForApp(page)

	await context.setOffline(true)
	await reloadOfflinePage(page)
	await startQuiz(page)

	await waitForPuzzle(page)

	await context.setOffline(false)
})

test('supports finishing a quiz when reconnecting mid-session', async ({
	page,
	context
}) => {
	await page.goto('/?duration=0')
	await waitForApp(page)
	await waitForServiceWorkerControl(page)
	await waitForApp(page)

	await context.setOffline(true)
	await reloadOfflinePage(page)

	await startQuiz(page)
	await waitForPuzzle(page)

	const puzzle = await readPuzzle(page)
	const puzzleNumber = await readPuzzleNumber(page)
	await submitAnswer(page, solvePuzzle(puzzle))
	await waitForNextPuzzle(page, puzzleNumber)

	await context.setOffline(false)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible()
	await page.getByTestId('btn-complete-yes').click()
	await expect(page.getByTestId('heading-results')).toBeVisible()
	await expect(page.getByTestId('results-summary-card')).toBeVisible()
})
