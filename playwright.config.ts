/// <reference types="node" />

import { defineConfig } from '@playwright/test'

const crossBrowserSmokeSpecs = [
	'accessibility.spec.ts',
	'global-nav.spec.ts',
	'onboarding-panel.spec.ts',
	'offline-fallback.spec.ts',
	'refresh-querystring.spec.ts',
	'update-lifecycle.spec.ts'
]

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI
		? [
				['github'],
				['json', { outputFile: 'test-results/playwright-report.json' }]
			]
		: 'list',
	use: {
		baseURL: process.env.CI ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173',
		locale: 'nb-NO',
		// Skip countdown & transitions so tests don't depend on timer patches.
		contextOptions: {
			reducedMotion: 'reduce',
			serviceWorkers: 'block'
		},
		trace: 'retain-on-failure-and-retries',
		video: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		},
		{
			name: 'firefox-smoke',
			testMatch: crossBrowserSmokeSpecs,
			use: { browserName: 'firefox' }
		},
		{
			name: 'webkit-smoke',
			testMatch: crossBrowserSmokeSpecs,
			use: { browserName: 'webkit' }
		},
		{
			name: 'firefox',
			use: { browserName: 'firefox' }
		},
		{
			name: 'webkit',
			use: { browserName: 'webkit' }
		}
	],
	webServer: {
		command: process.env.CI
			? 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173'
			: 'npm run dev -- --host 127.0.0.1 --port 5173',
		url: process.env.CI ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
})
