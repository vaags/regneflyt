import { expect, test, type Page } from '@playwright/test'
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

	test('keeps UI stable when install is interrupted', async ({
		page,
		context
	}) => {
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

	test('reload fallback still works when waiting worker becomes redundant', async ({
		page,
		context
	}) => {
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

		await expect(page.getByRole('alert')).toHaveCount(0)
	})
})
