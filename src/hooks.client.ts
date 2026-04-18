import { dev } from '$app/environment'
import { showToast } from '$lib/stores.svelte'
import { sw_registration_error } from '$lib/paraglide/messages.js'

const speedInsightsEnabled =
	import.meta.env.PUBLIC_ENABLE_SPEED_INSIGHTS === 'true'

if (!dev && speedInsightsEnabled) {
	void import('@vercel/speed-insights/sveltekit').then(
		({ injectSpeedInsights }) => {
			injectSpeedInsights()
		}
	)
}

if (!dev && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js').catch(() => {
		showToast(sw_registration_error(), { variant: 'error' })
	})
}
