import { dev } from '$app/environment'
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit'

// Initialize Vercel Speed Insights in production environments only
if (!dev) {
	injectSpeedInsights()
}
