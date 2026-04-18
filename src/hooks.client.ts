import { dev } from '$app/environment'
import { swRegistrationError } from '$lib/stores.svelte'

const speedInsightsEnabled =
	import.meta.env.PUBLIC_ENABLE_SPEED_INSIGHTS === 'true'

if (!dev && speedInsightsEnabled) {
	void import('@vercel/speed-insights/sveltekit').then(
		({ injectSpeedInsights }) => {
			injectSpeedInsights()
		}
	)
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js').catch(() => {
		swRegistrationError.current = true
	})
}
