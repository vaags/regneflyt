// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import UpdateNotification from '../../src/components/UpdateNotification.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	update_available: () => 'Update available',
	button_update: () => 'Update',
	button_close: () => 'Close'
}))

type StateChangeHandler = () => void

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

describe('UpdateNotification component', () => {
	let controllerChangeHandler: (() => void) | undefined
	let reloadMock: ReturnType<typeof vi.fn>

	const originalLocation = Object.getOwnPropertyDescriptor(window, 'location')
	const originalServiceWorker = Object.getOwnPropertyDescriptor(
		navigator,
		'serviceWorker'
	)

	beforeEach(() => {
		controllerChangeHandler = undefined
		reloadMock = vi.fn()

		// Mock window.location.reload
		Object.defineProperty(window, 'location', {
			value: { reload: reloadMock },
			configurable: true,
			writable: true
		})
	})

	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		if (originalLocation) {
			Object.defineProperty(window, 'location', originalLocation)
		}
		if (originalServiceWorker) {
			Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
		}
	})

	function setupServiceWorkerMock(options?: {
		waiting?: ServiceWorker | null
	}) {
		let updateFoundHandler: (() => void) | undefined
		const registration = {
			waiting: options?.waiting ?? null,
			installing: null as ServiceWorker | null,
			addEventListener: vi.fn((_event: string, handler: () => void) => {
				updateFoundHandler = handler
			}),
			_fireUpdateFound: () => updateFoundHandler?.()
		}

		Object.defineProperty(navigator, 'serviceWorker', {
			value: {
				ready: Promise.resolve(registration),
				controller: {},
				addEventListener: vi.fn((event: string, handler: () => void) => {
					if (event === 'controllerchange') controllerChangeHandler = handler
				})
			},
			configurable: true,
			writable: true
		})

		return registration
	}

	it('shows notification when a worker is already waiting', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByRole } = render(UpdateNotification)

		const alert = await findByRole('alert')
		expect(alert.textContent).toContain('Update available')
	})

	it('does not show notification when no worker is waiting', async () => {
		setupServiceWorkerMock({ waiting: null })

		const { queryByRole } = render(UpdateNotification)

		// Flush the microtask queue for navigator.serviceWorker.ready
		await new Promise((r) => setTimeout(r, 0))
		expect(queryByRole('alert')).toBeNull()
	})

	it('shows notification when a new worker installs via updatefound', async () => {
		const registration = setupServiceWorkerMock()

		const { findByRole } = render(UpdateNotification)

		// Flush the ready promise
		await new Promise((r) => setTimeout(r, 0))

		// Simulate a new worker arriving and installing
		const newWorker = createMockWorker('installing')
		registration.installing = newWorker as ServiceWorker
		registration._fireUpdateFound()

		// Simulate the worker transitioning to installed
		Object.defineProperty(newWorker, 'state', { value: 'installed' })
		newWorker._stateChangeHandler?.()

		const alert = await findByRole('alert')
		expect(alert.textContent).toContain('Update available')
	})

	it('sends SKIP_WAITING to the worker when update button is clicked', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByText } = render(UpdateNotification)

		const updateButton = await findByText('Update')
		updateButton.click()

		expect(waitingWorker.postMessage).toHaveBeenCalledWith({
			type: 'SKIP_WAITING'
		})
	})

	it('hides notification when dismiss button is clicked', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByLabelText, queryByRole } = render(UpdateNotification)

		const dismissButton = await findByLabelText('Close')
		dismissButton.click()

		// Wait for reactivity
		await new Promise((r) => setTimeout(r, 0))
		expect(queryByRole('alert')).toBeNull()
	})

	it('reloads the page on controllerchange', async () => {
		setupServiceWorkerMock()

		render(UpdateNotification)

		// Flush the ready promise
		await new Promise((r) => setTimeout(r, 0))

		controllerChangeHandler?.()
		expect(reloadMock).toHaveBeenCalledOnce()
	})
})
