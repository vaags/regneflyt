// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import UpdateNotification from '#lib/components/widgets/UpdateNotification.svelte'
import { update_available } from '#lib/paraglide/messages.js'
import { overwriteGetLocale } from '#lib/paraglide/runtime.js'

vi.mock('#lib/paraglide/messages.js', () => ({
	update_available: (_inputs?: unknown, options?: { locale?: string }) =>
		options?.locale === 'nb' ? 'Oppdatering tilgjengelig' : 'Update available',
	button_update: (_inputs?: unknown, options?: { locale?: string }) =>
		options?.locale === 'nb' ? 'Oppdater' : 'Update',
	button_close: (_inputs?: unknown, options?: { locale?: string }) =>
		options?.locale === 'nb' ? 'Lukk' : 'Close'
}))

type StateChangeHandler = (event: Event) => void

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
	let controllerChangeHandler: ((event: Event) => void) | undefined
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
		let updateFoundHandler: ((event: Event) => void) | undefined
		const registration = {
			waiting: options?.waiting ?? null,
			installing: null as ServiceWorker | null,
			addEventListener: vi.fn(
				(_event: string, handler: (event: Event) => void) => {
					updateFoundHandler = handler
				}
			),
			removeEventListener: vi.fn(),
			_fireUpdateFound: () => updateFoundHandler?.(new Event('updatefound'))
		}

		Object.defineProperty(navigator, 'serviceWorker', {
			value: {
				ready: Promise.resolve(registration),
				controller: {},
				addEventListener: vi.fn(
					(event: string, handler: (event: Event) => void) => {
						if (event === 'controllerchange') controllerChangeHandler = handler
					}
				),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		})

		return registration
	}

	it('shows notification when a worker is already waiting', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByTestId } = render(UpdateNotification)

		const alert = await findByTestId('update-notification-alert')
		expect(alert.textContent).toContain('Update available')
	})

	it('does not show notification when waiting worker is already redundant', async () => {
		const waitingWorker = createMockWorker('redundant')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { queryByTestId } = render(UpdateNotification)

		await new Promise((r) => {
			setTimeout(r, 0)
		})
		expect(queryByTestId('update-notification-alert')).toBeNull()
	})

	it('does not show notification when no worker is waiting', async () => {
		setupServiceWorkerMock({ waiting: null })

		const { queryByTestId } = render(UpdateNotification)

		// Flush the microtask queue for navigator.serviceWorker.ready
		await new Promise((r) => {
			setTimeout(r, 0)
		})
		expect(queryByTestId('update-notification-alert')).toBeNull()
	})

	it('keeps the polite region mounted while no update is pending', async () => {
		setupServiceWorkerMock({ waiting: null })

		const { queryByRole } = render(UpdateNotification)

		await new Promise((r) => {
			setTimeout(r, 0)
		})
		// A live region inserted together with its content is not announced, so
		// the region must exist before the notification appears.
		expect(queryByRole('status')).not.toBeNull()
	})

	it('reuses its persistent polite region for repeat announcements', async () => {
		setupServiceWorkerMock({ waiting: null })

		const { component, getByLabelText, getByRole } = render(
			UpdateNotification,
			{
				locale: 'en'
			}
		)
		const instance = component as { showNotification: () => void }
		const politeRegion = getByRole('status')

		expect(politeRegion.textContent.trim()).toBe('')

		instance.showNotification()
		await tick()
		expect(getByRole('status')).toBe(politeRegion)
		expect(politeRegion.textContent.trim()).toBe(
			update_available({}, { locale: 'en' })
		)

		getByLabelText('Close').click()
		await tick()
		expect(getByRole('status')).toBe(politeRegion)
		expect(politeRegion.textContent.trim()).toBe('')

		instance.showNotification()
		await tick()
		expect(getByRole('status')).toBe(politeRegion)
		expect(politeRegion.textContent.trim()).toBe(
			update_available({}, { locale: 'en' })
		)
	})

	it('shows notification when a new worker installs via updatefound', async () => {
		const registration = setupServiceWorkerMock()

		const { findByTestId } = render(UpdateNotification)

		// Flush the ready promise
		await new Promise((r) => {
			setTimeout(r, 0)
		})

		// Simulate a new worker arriving and installing
		const newWorker = createMockWorker('installing')
		registration.installing = newWorker
		registration._fireUpdateFound()

		// Simulate the worker transitioning to installed
		Object.defineProperty(newWorker, 'state', { value: 'installed' })
		newWorker._stateChangeHandler?.(new Event('statechange'))

		const alert = await findByTestId('update-notification-alert')
		expect(alert.textContent).toContain('Update available')
	})

	it('sends SKIP_WAITING to the worker when update button is clicked', async () => {
		const waitingWorker = createMockWorker('installed')
		const postMessageSpy = vi.spyOn(waitingWorker, 'postMessage')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByText } = render(UpdateNotification)

		const updateButton = await findByText('Update')
		updateButton.click()

		expect(postMessageSpy).toHaveBeenCalledWith({
			type: 'SKIP_WAITING'
		})
	})

	it('hides notification when dismiss button is clicked', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByLabelText, queryByTestId } = render(UpdateNotification)

		const dismissButton = await findByLabelText('Close')
		dismissButton.click()

		// Wait for reactivity
		await new Promise((r) => {
			setTimeout(r, 0)
		})
		expect(queryByTestId('update-notification-alert')).toBeNull()
	})

	it('reloads the page on controllerchange', async () => {
		setupServiceWorkerMock()

		render(UpdateNotification)

		// Flush the ready promise
		await new Promise((r) => {
			setTimeout(r, 0)
		})

		controllerChangeHandler?.(new Event('controllerchange'))
		expect(reloadMock).toHaveBeenCalledOnce()
	})

	it('handles interrupted updates when installing worker becomes redundant', async () => {
		const registration = setupServiceWorkerMock()

		const { queryByTestId } = render(UpdateNotification)
		await new Promise((r) => {
			setTimeout(r, 0)
		})

		const newWorker = createMockWorker('installing')
		registration.installing = newWorker
		registration._fireUpdateFound()

		Object.defineProperty(newWorker, 'state', { value: 'redundant' })
		newWorker._stateChangeHandler?.(new Event('statechange'))
		await new Promise((r) => {
			setTimeout(r, 0)
		})

		expect(queryByTestId('update-notification-alert')).toBeNull()
		expect(reloadMock).not.toHaveBeenCalled()
	})

	it('keeps the prompt as a reload fallback when the waiting worker dies', async () => {
		const waitingWorker = createMockWorker('installed')
		setupServiceWorkerMock({ waiting: waitingWorker })

		const { findByTestId, findByText } = render(UpdateNotification)
		await findByTestId('update-notification-alert')

		Object.defineProperty(waitingWorker, 'state', { value: 'redundant' })
		waitingWorker._stateChangeHandler?.(new Event('statechange'))
		await new Promise((r) => {
			setTimeout(r, 0)
		})

		// The worker usually went redundant because another tab activated the
		// update, so the prompt stays and reloading is what applies it.
		await findByTestId('update-notification-alert')
		const updateButton = await findByText('Update')
		updateButton.click()

		expect(reloadMock).toHaveBeenCalledOnce()
	})

	it('updates locale-dependent labels when locale prop changes', async () => {
		const { component, findByTestId, findByLabelText, rerender } = render(
			UpdateNotification,
			{ locale: 'en' }
		)
		const instance = component as { showNotification: () => void }
		instance.showNotification()

		// The polite announcer repeats the message, so the text alone is ambiguous.
		expect(
			(await findByTestId('update-notification-message')).textContent
		).toBe('Update available')
		await findByLabelText('Close')

		await rerender({ locale: 'nb' })
		expect(
			(await findByTestId('update-notification-message')).textContent
		).toBe('Oppdatering tilgjengelig')
		await findByLabelText('Lukk')
	})

	it('offsets the notification above the sticky global nav', async () => {
		const { component, findByTestId } = render(UpdateNotification)
		const instance = component as { showNotification: () => void }
		instance.showNotification()

		const alert = await findByTestId('update-notification-alert')
		// The exact offsets track the nav height, so match the shape rather than
		// the pixel values: safe-area aware, and larger from the md breakpoint up.
		expect(alert.className).toMatch(
			/(?<!:)bottom-\[calc\(env\(safe-area-inset-bottom\)\+\d+px\)\]/
		)
		expect(alert.className).toMatch(
			/md:bottom-\[calc\(env\(safe-area-inset-bottom\)\+\d+px\)\]/
		)
	})
})
