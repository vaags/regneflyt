// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import UpdateNotification from '$lib/components/widgets/UpdateNotification.svelte'
import { overwriteGetLocale } from '$lib/paraglide/runtime.js'

vi.mock('$lib/paraglide/messages.js', () => ({
	update_available: (_inputs?: unknown, options?: { locale?: string }) =>
		options?.locale === 'nb' ? 'Oppdatering tilgjengelig' : 'Update available',
	button_update: (_inputs?: unknown, options?: { locale?: string }) =>
		options?.locale === 'nb' ? 'Oppdater' : 'Update',
	button_close: (_inputs?: unknown, options?: { locale?: string }) =>
		options?.locale === 'nb' ? 'Lukk' : 'Close'
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
		removeEventListener: vi.fn(),
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
		overwriteGetLocale(() => 'en')
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

	it('handles interrupted updates when installing worker becomes redundant', async () => {
		const registration = setupServiceWorkerMock()

		render(UpdateNotification)
		await new Promise((r) => setTimeout(r, 0))

		const newWorker = createMockWorker('installing')
		registration.installing = newWorker as ServiceWorker
		registration._fireUpdateFound()

		Object.defineProperty(newWorker, 'state', { value: 'redundant' })
		newWorker._stateChangeHandler?.()
	})

	it('forwards skip waiting across tabs via storage events', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		render(UpdateNotification)
		await new Promise((r) => setTimeout(r, 0))

		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'regneflyt.sw.skip-waiting',
				newValue: String(Date.now())
			})
		)

		expect(waitingWorker.postMessage).toHaveBeenCalledWith({
			type: 'SKIP_WAITING'
		})
	})

	it('still posts SKIP_WAITING when localStorage write fails', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const setItemSpy = vi
			.spyOn(Storage.prototype, 'setItem')
			.mockImplementation(() => {
				throw new Error('storage denied')
			})

		const { findByText } = render(UpdateNotification)
		const updateButton = await findByText('Update')
		updateButton.click()

		expect(waitingWorker.postMessage).toHaveBeenCalledWith({
			type: 'SKIP_WAITING'
		})
		expect(setItemSpy).toHaveBeenCalled()
	})

	it('updates locale-dependent labels when locale prop changes', async () => {
		const { component, findByText, findByLabelText, rerender } = render(
			UpdateNotification,
			{ locale: 'en' }
		)

		component.showNotification()
		await findByText('Update available')
		await findByLabelText('Close')

		await rerender({ locale: 'nb' })
		await findByText('Oppdatering tilgjengelig')
		await findByLabelText('Lukk')
	})

	it('offsets the notification above the sticky global nav', async () => {
		const { component, findByRole } = render(UpdateNotification)

		component.showNotification()

		const alert = await findByRole('alert')
		expect(alert.className).toContain(
			'bottom-[calc(env(safe-area-inset-bottom)+148px)]'
		)
		expect(alert.className).toContain(
			'md:bottom-[calc(env(safe-area-inset-bottom)+160px)]'
		)
	})
})
