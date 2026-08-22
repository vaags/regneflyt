import { browser, dev } from '$app/environment'
import { showToast } from '$lib/stores'
import { sw_registration_error } from '$lib/paraglide/messages.js'

const isLocalRuntime =
	browser &&
	['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

if (!dev && !isLocalRuntime) {
	void import('@vercel/speed-insights/sveltekit').then(
		({ injectSpeedInsights }) => {
			injectSpeedInsights()
		}
	)

	void import('@vercel/analytics/sveltekit').then(({ injectAnalytics }) => {
		injectAnalytics()
	})
}

if (!dev && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js').catch(() => {
		showToast(sw_registration_error(), { variant: 'error' })
	})
}
