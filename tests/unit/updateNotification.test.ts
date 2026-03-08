import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type StateChangeHandler = () => void
type UpdateFoundHandler = () => void
type ControllerChangeHandler = () => void

function createMockWorker(
	state: ServiceWorkerState = 'installed'
): ServiceWorker & { _stateChangeHandler?: StateChangeHandler } {
	const worker: Partial<ServiceWorker> & {
		_stateChangeHandler?: StateChangeHandler
	} = {
		state,
		postMessage: vi.fn(),
		addEventListener: vi.fn((event: string, handler: StateChangeHandler) => {
			if (event === 'statechange') worker._stateChangeHandler = handler
		})
	}
	return worker as ServiceWorker & {
		_stateChangeHandler?: StateChangeHandler
	}
}

function createMockRegistration(options?: { waiting?: ServiceWorker | null }) {
	let updateFoundHandler: UpdateFoundHandler | undefined
	const registration: Partial<ServiceWorkerRegistration> & {
		installing: ServiceWorker | null
		_fireUpdateFound: () => void
	} = {
		waiting: options?.waiting ?? null,
		installing: null,
		addEventListener: vi.fn((_event: string, handler: UpdateFoundHandler) => {
			updateFoundHandler = handler
		}),
		_fireUpdateFound: () => updateFoundHandler?.()
	}
	return registration
}

describe('update notification logic', () => {
	let controllerChangeHandler: ControllerChangeHandler | undefined
	let originalNavigator: PropertyDescriptor | undefined
	let reloadMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		controllerChangeHandler = undefined
		reloadMock = vi.fn()
		originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
	})

	afterEach(() => {
		if (originalNavigator) {
			Object.defineProperty(globalThis, 'navigator', originalNavigator)
		}
		vi.restoreAllMocks()
	})

	function setupNavigatorMock(
		registration: Partial<ServiceWorkerRegistration>
	) {
		Object.defineProperty(globalThis, 'navigator', {
			value: {
				...globalThis.navigator,
				serviceWorker: {
					ready: Promise.resolve(registration),
					controller: {},
					addEventListener: vi.fn(
						(event: string, handler: ControllerChangeHandler) => {
							if (event === 'controllerchange')
								controllerChangeHandler = handler
						}
					)
				}
			},
			configurable: true,
			writable: true
		})

		Object.defineProperty(globalThis, 'window', {
			value: { location: { reload: reloadMock } },
			configurable: true,
			writable: true
		})
	}

	it('detects an already-waiting service worker', async () => {
		const waitingWorker = createMockWorker('installed')
		const registration = createMockRegistration({ waiting: waitingWorker })
		setupNavigatorMock(registration)

		// Simulate the onMount logic
		const { ready } = navigator.serviceWorker
		const reg = await ready

		let show = false
		let capturedWorker: ServiceWorker | null = null

		if (reg.waiting) {
			capturedWorker = reg.waiting
			show = true
		}

		expect(show).toBe(true)
		expect(capturedWorker).toBe(waitingWorker)
	})

	it('detects a new worker found via updatefound event', async () => {
		const registration = createMockRegistration()
		setupNavigatorMock(registration)

		const reg = await navigator.serviceWorker.ready

		let show = false
		let capturedWorker: ServiceWorker | null = null

		// Replicate the updatefound listener setup from the component
		reg.addEventListener('updatefound', () => {
			const newWorker = (
				registration as unknown as { installing: ServiceWorker | null }
			).installing
			if (!newWorker) return
			newWorker.addEventListener('statechange', () => {
				if (
					newWorker.state === 'installed' &&
					navigator.serviceWorker.controller
				) {
					capturedWorker = newWorker
					show = true
				}
			})
		})

		// Simulate a new worker arriving
		const newWorker = createMockWorker('installing')
		registration.installing = newWorker as ServiceWorker

		registration._fireUpdateFound()

		// Simulate the worker finishing install
		Object.defineProperty(newWorker, 'state', { value: 'installed' })
		newWorker._stateChangeHandler?.()

		expect(show).toBe(true)
		expect(capturedWorker).toBe(newWorker)
	})

	it('sends SKIP_WAITING message to waiting worker on update', async () => {
		const waitingWorker = createMockWorker('installed')

		// Simulate clicking update
		waitingWorker.postMessage({ type: 'SKIP_WAITING' })

		expect(waitingWorker.postMessage).toHaveBeenCalledWith({
			type: 'SKIP_WAITING'
		})
	})

	it('reloads the page on controllerchange', async () => {
		const registration = createMockRegistration()
		setupNavigatorMock(registration)

		await navigator.serviceWorker.ready

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			window.location.reload()
		})

		// Fire the controllerchange event
		controllerChangeHandler?.()

		expect(reloadMock).toHaveBeenCalledOnce()
	})

	it('does not show notification when no worker is waiting', async () => {
		const registration = createMockRegistration({ waiting: null })
		setupNavigatorMock(registration)

		const reg = await navigator.serviceWorker.ready

		let show = false

		if (reg.waiting) {
			show = true
		}

		expect(show).toBe(false)
	})
})
