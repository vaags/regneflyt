import type { Page } from '@playwright/test'

/** The scriptable handle the mock exposes on `window.__swTest`. */
export type SwTestHandle = {
	triggerInterruptedUpdate: () => void
	triggerWaitingRedundant: () => void
	emitControllerChange: () => void
	isWaitingWorkerRedundant: () => boolean
}

/**
 * Replaces `navigator.serviceWorker` with a scriptable stub so update-lifecycle
 * states can be driven from a spec without shipping a real second worker build.
 * Pass `withWaitingWorker` to decide whether the page starts with an update
 * already waiting, which is what surfaces the update notification.
 *
 * Specs using this must clean up with `cleanupServiceWorkerTestState` from
 * `./fixtures`.
 */
export async function installServiceWorkerMock(
	page: Page,
	withWaitingWorker = true
): Promise<void> {
	await page.addInitScript(
		({ waiting }) => {
			type EventHandler = (event: Event) => void

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
					postMessage() {}
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
				},
				// `on()` from svelte/events calls this on component teardown.
				removeEventListener(event: string) {
					if (event === 'updatefound') updateFoundHandler = null
				}
			}

			Object.defineProperty(navigator, 'serviceWorker', {
				configurable: true,
				value: {
					ready: Promise.resolve(registration),
					register: () =>
						Promise.resolve(
							registration as unknown as ServiceWorkerRegistration
						),
					controller: {},
					addEventListener(event: string, handler: EventHandler) {
						if (event === 'controllerchange')
							controllerChangeHandlers.push(handler)
					},
					removeEventListener(event: string, handler: EventHandler) {
						if (event !== 'controllerchange') return
						const index = controllerChangeHandlers.indexOf(handler)
						if (index !== -1) controllerChangeHandlers.splice(index, 1)
					}
				}
			})

			const testWindow = window as unknown as { __swTest: SwTestHandle }
			testWindow.__swTest = {
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
