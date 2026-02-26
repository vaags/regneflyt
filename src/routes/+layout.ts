import { browser } from '$app/environment'
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit'

if (browser && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
	injectSpeedInsights()
}

if (browser && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js').catch(() => {
			// Ignore registration errors to avoid breaking app boot.
		})
	})
}
