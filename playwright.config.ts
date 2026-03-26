import { defineConfig } from '@playwright/test'

const ciSmokeTestMatch = [
	'tests/e2e/routing.spec.ts',
	'tests/e2e/results-flow.spec.ts',
	'tests/e2e/refresh-querystring.spec.ts',
	'tests/e2e/offline-fallback.spec.ts',
	'tests/e2e/accessibility.spec.ts',
	'tests/e2e/update-lifecycle.spec.ts'
]

const useCiSmokeSubset =
	!!process.env.CI && process.env.PLAYWRIGHT_FULL_SUITE !== 'true'
const isVercelCi = !!process.env.CI && process.env.VERCEL === '1'

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: useCiSmokeSubset ? ciSmokeTestMatch : undefined,
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: process.env.CI ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173',
		locale: 'nb-NO',
		// Skip countdown & transitions so tests don't depend on timer patches.
		contextOptions: {
			reducedMotion: 'reduce',
			serviceWorkers: 'block'
		},
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: process.env.CI
			? isVercelCi
				? 'npm run preview -- --host 127.0.0.1 --port 4173'
				: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173'
			: 'npm run dev -- --host 127.0.0.1 --port 5173',
		url: process.env.CI ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
})
