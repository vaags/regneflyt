import { browser, dev } from '$app/env'
import { injectAnalytics } from '@vercel/analytics/sveltekit-next'
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit-next'
import { sw_registration_error } from '#lib/paraglide/messages.js'
import { showToast } from '#lib/stores.ts'

const isLocalRuntime =
	browser &&
	['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

if (!dev && !isLocalRuntime) {
	injectSpeedInsights()
	injectAnalytics()
}

if (!dev && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
	navigator.serviceWorker
		.register('/service-worker.js', { type: 'module' })
		.catch(() => {
			showToast(sw_registration_error(), { variant: 'error' })
		})
}
