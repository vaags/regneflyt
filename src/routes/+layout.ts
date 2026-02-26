import { browser } from '$app/environment'
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit'

if (
	browser &&
	!['localhost', '127.0.0.1'].includes(window.location.hostname)
) {
	injectSpeedInsights()
}
