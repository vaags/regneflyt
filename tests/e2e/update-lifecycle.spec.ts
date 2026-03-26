import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { waitForApp } from './e2eHelpers'

test.describe('service worker update lifecycle', () => {
	async function installServiceWorkerMock(
		page: Page,
		withWaitingWorker = true
	) {
		await page.addInitScript(
			({ waiting }) => {
				type StateChangeHandler = () => void

				const events: string[] = []
				const controllerChangeHandlers: Array<() => void> = []

				const createWorker = (initialState: ServiceWorkerState) => {
					let state: ServiceWorkerState = initialState
					let stateChangeHandler: StateChangeHandler | null = null

					return {
						get state() {
							return state
						},
						setState(next: ServiceWorkerState) {
							state = next
							stateChangeHandler?.()
						},
						addEventListener(event: string, handler: StateChangeHandler) {
							if (event === 'statechange') stateChangeHandler = handler
						},
						removeEventListener() {
							stateChangeHandler = null
						},
						postMessage(message: { type?: string }) {
							events.push(`postMessage:${message.type ?? 'unknown'}`)
						}
					}
				}

				const waitingWorker = waiting ? createWorker('installed') : null
				let updateFoundHandler: (() => void) | null = null
				let installingWorker: ReturnType<typeof createWorker> | null = null

				const registration = {
					waiting: waitingWorker,
					get installing() {
						return installingWorker
					},
					set installing(value) {
						installingWorker = value
					},
					addEventListener(event: string, handler: () => void) {
						if (event === 'updatefound') updateFoundHandler = handler
					}
				}

				Object.defineProperty(navigator, 'serviceWorker', {
					configurable: true,
					value: {
						ready: Promise.resolve(registration),
						controller: {},
						addEventListener(event: string, handler: () => void) {
							if (event === 'controllerchange')
								controllerChangeHandlers.push(handler)
						}
					}
				})
				;(
					window as unknown as {
						__swTestEvents: string[]
						__swTest: {
							triggerInterruptedUpdate: () => void
							triggerWaitingRedundant: () => void
							emitControllerChange: () => void
						}
					}
				).__swTestEvents = events
				;(
					window as unknown as {
						__swTest: {
							triggerInterruptedUpdate: () => void
							triggerWaitingRedundant: () => void
							emitControllerChange: () => void
						}
					}
				).__swTest = {
					triggerInterruptedUpdate: () => {
						const worker = createWorker('installing')
						registration.installing = worker
						updateFoundHandler?.()
						worker.setState('redundant')
					},
					triggerWaitingRedundant: () => {
						if (!registration.waiting) return
						registration.waiting.setState('redundant')
					},
					emitControllerChange: () => {
						for (const handler of controllerChangeHandlers) handler()
					}
				}
			},
			{ waiting: withWaitingWorker }
		)
	}

	async function collectTelemetry(context: BrowserContext) {
		const events: string[] = []
		await context.route('**/api/sw-telemetry', async (route) => {
			const payload = route.request().postDataJSON() as { event?: string }
			if (payload.event) events.push(payload.event)
			await route.fulfill({
				status: 202,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true })
			})
		})
		return events
	}

	test('captures interrupted update telemetry and keeps UI stable', async ({
		page,
		context
	}) => {
		const telemetryEvents = await collectTelemetry(context)
		await installServiceWorkerMock(page, false)

		await page.goto('/')
		await waitForApp(page)

		await page.evaluate(() => {
			;(
				window as unknown as {
					__swTest: { triggerInterruptedUpdate: () => void }
				}
			).__swTest.triggerInterruptedUpdate()
		})

		await expect(page.getByRole('alert')).toHaveCount(0)
		await expect
			.poll(() => telemetryEvents.includes('sw_client_install_interrupted'))
			.toBeTruthy()
	})

	test('propagates skip-waiting across tabs', async ({ context }) => {
		const pageA = await context.newPage()
		const pageB = await context.newPage()

		await installServiceWorkerMock(pageA, true)
		await installServiceWorkerMock(pageB, true)

		await pageA.goto('/')
		await pageB.goto('/')
		await waitForApp(pageA)
		await waitForApp(pageB)

		await expect(pageA.getByRole('alert')).toBeVisible()
		await expect(pageB.getByRole('alert')).toBeVisible()

		await pageA.getByRole('alert').getByRole('button').first().click()

		await expect
			.poll(async () => {
				const events = await pageB.evaluate(
					() =>
						(window as unknown as { __swTestEvents: string[] }).__swTestEvents
				)
				return events.includes('postMessage:SKIP_WAITING')
			})
			.toBeTruthy()
	})

	test('records rollback behavior when waiting worker becomes redundant', async ({
		page,
		context
	}) => {
		const telemetryEvents = await collectTelemetry(context)
		await installServiceWorkerMock(page, true)

		await page.goto('/')
		await waitForApp(page)
		await expect(page.getByRole('alert')).toBeVisible()

		await page.evaluate(() => {
			;(
				window as unknown as {
					__swTest: { triggerWaitingRedundant: () => void }
				}
			).__swTest.triggerWaitingRedundant()
		})

		await page.getByRole('alert').getByRole('button').first().click()

		await expect
			.poll(() => telemetryEvents.includes('sw_client_waiting_redundant'))
			.toBeTruthy()
		await expect
			.poll(() =>
				telemetryEvents.includes('sw_client_reload_without_waiting_worker')
			)
			.toBeTruthy()
	})
})
