/// <reference types="node" />

import { defineConfig } from '@playwright/test'
import {
	buildsE2eServer,
	isCi,
	usesProductionE2eServer
} from './tests/e2e/e2eServerMode'

const crossBrowserSmokeSpecs = [
	'accessibility.spec.ts',
	'global-nav.spec.ts',
	'onboarding-panel.spec.ts',
	'offline-fallback.spec.ts',
	'refresh-querystring.spec.ts',
	'update-lifecycle.spec.ts'
]

const e2eBaseUrl = usesProductionE2eServer
	? 'http://127.0.0.1:4173'
	: 'http://127.0.0.1:5173'

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: isCi,
	// Development-mode runs prioritize quick feedback. Production mode builds
	// before starting preview; preview mode reuses an already-built output.
	retries: isCi ? 2 : 1,
	...(isCi ? { workers: '50%' } : {}),
	reporter: isCi
		? [
				['github'],
				['json', { outputFile: 'test-results/playwright-report.json' }]
			]
		: 'list',
	use: {
		baseURL: e2eBaseUrl,
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
		command: usesProductionE2eServer
			? `${buildsE2eServer ? 'npm run build && ' : ''}npm run preview -- --host 127.0.0.1 --port 4173`
			: 'npm run dev -- --host 127.0.0.1 --port 5173',
		url: e2eBaseUrl,
		reuseExistingServer: !usesProductionE2eServer,
		timeout: 120_000
	}
})
