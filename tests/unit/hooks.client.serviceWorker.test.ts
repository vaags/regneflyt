// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const appEnvironment = vi.hoisted(() => ({ browser: true, dev: false }))

vi.mock('$app/env', () => appEnvironment)
vi.mock('@vercel/analytics/sveltekit-next', () => ({
	injectAnalytics: vi.fn()
}))
vi.mock('#lib/paraglide/messages.js', () => ({
	sw_registration_error: () => 'Offline support could not be enabled.'
}))
vi.mock('#lib/stores.ts', () => ({ showToast: vi.fn() }))

import { showToast } from '#lib/stores.ts'

type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, 'register'>

describe('client service worker registration', () => {
	const originalReadyState = Object.getOwnPropertyDescriptor(
		document,
		'readyState'
	)
	const originalServiceWorker = Object.getOwnPropertyDescriptor(
		navigator,
		'serviceWorker'
	)

	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
		appEnvironment.browser = true
		appEnvironment.dev = false
	})

	afterEach(() => {
		if (originalReadyState) {
			Object.defineProperty(document, 'readyState', originalReadyState)
		}
		if (originalServiceWorker) {
			Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
		}
	})

	function setReadyState(readyState: DocumentReadyState): void {
		Object.defineProperty(document, 'readyState', {
			configurable: true,
			value: readyState
		})
	}

	function setServiceWorker(
		register: ServiceWorkerContainerLike['register']
	): void {
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable: true,
			value: { register } satisfies ServiceWorkerContainerLike
		})
	}

	it('registers after the load event while the document is loading', async () => {
		const register = vi.fn<ServiceWorkerContainerLike['register']>(() =>
			Promise.resolve({} as ServiceWorkerRegistration)
		)
		setReadyState('loading')
		setServiceWorker(register)

		await import('../../src/hooks.client')

		expect(register).not.toHaveBeenCalled()
		window.dispatchEvent(new Event('load'))
		await Promise.resolve()

		expect(register).toHaveBeenCalledOnce()
		expect(register).toHaveBeenCalledWith('/service-worker.js', {
			type: 'module'
		})
	})

	it('registers immediately when the document has already loaded', async () => {
		const register = vi.fn<ServiceWorkerContainerLike['register']>(() =>
			Promise.resolve({} as ServiceWorkerRegistration)
		)
		setReadyState('complete')
		setServiceWorker(register)

		await import('../../src/hooks.client')

		expect(register).toHaveBeenCalledOnce()
	})

	it('shows an error toast when deferred registration fails', async () => {
		const register = vi.fn<ServiceWorkerContainerLike['register']>(() =>
			Promise.reject(new Error('registration failed'))
		)
		setReadyState('loading')
		setServiceWorker(register)

		await import('../../src/hooks.client')
		window.dispatchEvent(new Event('load'))
		await Promise.resolve()
		await Promise.resolve()

		expect(showToast).toHaveBeenCalledWith(
			'Offline support could not be enabled.',
			{ variant: 'error' }
		)
	})
})
