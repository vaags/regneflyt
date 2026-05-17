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

// This test needs service workers to verify offline support.
// Service workers are not available in dev mode, only in production builds.
// eslint-disable-next-line playwright/no-skipped-test -- service workers require a production build; test is intentionally skipped in dev mode
test.skip(process.env.CI == null, 'service workers require a production build')
test.use({ contextOptions: { serviceWorkers: 'allow' } })

test.afterEach(async ({ page, context }) => {
	await cleanupServiceWorkerTestState(page, context)
})

async function waitForServiceWorkerControl(page: Page) {
	await page.evaluate(async () => {
		if (!('serviceWorker' in navigator)) {
			throw new Error('Service worker is not supported in this environment')
		}

		const reg = await navigator.serviceWorker.ready

		// Wait until the SW is actively controlling this page, not just
		// installed. Without this the reload below can race against
		// activation and abort with net::ERR_ABORTED.
		if (!navigator.serviceWorker.controller) {
			await new Promise<void>((resolve) => {
				navigator.serviceWorker.addEventListener(
					'controllerchange',
					() => {
						resolve()
					},
					{ once: true }
				)
				// If the SW is waiting, nudge it to activate
				reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
			})
		}
	})
}

test('supports starting a quiz while offline after initial load', async ({
	page,
	context
}) => {
	await page.goto('/?duration=0')
	await waitForApp(page)
	await waitForServiceWorkerControl(page)

	await context.setOffline(true)
	await page.reload({ waitUntil: 'domcontentloaded' })

	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
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

	await context.setOffline(true)
	await page.reload({ waitUntil: 'domcontentloaded' })
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()

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
