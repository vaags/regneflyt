import { dev } from '$app/environment'

const speedInsightsEnabled =
	import.meta.env.PUBLIC_ENABLE_SPEED_INSIGHTS === 'true'

if (!dev && speedInsightsEnabled) {
	void import('@vercel/speed-insights/sveltekit').then(
		({ injectSpeedInsights }) => {
			injectSpeedInsights()
		}
	)
}
