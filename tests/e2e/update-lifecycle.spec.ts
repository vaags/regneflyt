import { expect, test, type Page } from '@playwright/test'
import { waitForApp } from './e2eHelpers'

test.describe('service worker update lifecycle', () => {
	async function installServiceWorkerMock(
		page: Page,
		withWaitingWorker = true
	) {
		await page.addInitScript(
			({ waiting }) => {
				type EventHandler = (event: Event) => void

				const events: string[] = []
				const controllerChangeHandlers: EventHandler[] = []

				const createWorker = (initialState: ServiceWorkerState) => {
					let state: ServiceWorkerState = initialState
					let stateChangeHandler: EventHandler | null = null

					return {
						get state() {
							return state
						},
						setState(next: ServiceWorkerState) {
							state = next
							stateChangeHandler?.(new Event('statechange'))
						},
						addEventListener(event: string, handler: EventHandler) {
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
				let updateFoundHandler: EventHandler | null = null
				let installingWorker: ReturnType<typeof createWorker> | null = null

				const registration = {
					waiting: waitingWorker,
					get installing() {
						return installingWorker
					},
					set installing(value) {
						installingWorker = value
					},
					addEventListener(event: string, handler: EventHandler) {
						if (event === 'updatefound') updateFoundHandler = handler
					}
				}

				Object.defineProperty(navigator, 'serviceWorker', {
					configurable: true,
					value: {
						ready: Promise.resolve(registration),
						controller: {},
						addEventListener(event: string, handler: EventHandler) {
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
							isWaitingWorkerRedundant: () => boolean
						}
					}
				).__swTest = {
					triggerInterruptedUpdate: () => {
						const worker = createWorker('installing')
						registration.installing = worker
						updateFoundHandler?.(new Event('updatefound'))
						worker.setState('redundant')
					},
					triggerWaitingRedundant: () => {
						if (!registration.waiting) return
						registration.waiting.setState('redundant')
					},
					emitControllerChange: () => {
						for (const handler of controllerChangeHandlers) {
							handler(new Event('controllerchange'))
						}
					},
					isWaitingWorkerRedundant: () => {
						return registration.waiting?.state === 'redundant'
					}
				}
			},
			{ waiting: withWaitingWorker }
		)
	}

	test('keeps UI stable when install is interrupted', async ({ page }) => {
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

		await pageA.getByTestId('btn-update-notification-update').first().click()

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
		page
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

		await expect
			.poll(async () => {
				return page.evaluate(() =>
					(
						window as unknown as {
							__swTest: { isWaitingWorkerRedundant: () => boolean }
						}
					).__swTest.isWaitingWorkerRedundant()
				)
			})
			.toBeTruthy()

		// Ensure the post-reload document sees no waiting worker once the old one is redundant.
		await installServiceWorkerMock(page, false)

		const reload = page.waitForNavigation({ waitUntil: 'domcontentloaded' })
		await page.getByTestId('btn-update-notification-update').first().click()
		await reload

		await expect(page.getByRole('alert')).toHaveCount(0)
	})
})
