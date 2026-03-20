import { spawn } from 'node:child_process'
import process from 'node:process'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const baseUrl = 'http://127.0.0.1:4173/'
const isCi = process.env.CI === 'true'

function getNumberEnv(name, fallback) {
	const raw = process.env[name]
	if (!raw) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

const minPerformanceScore = getNumberEnv(
	'LIGHTHOUSE_MIN_PERFORMANCE_SCORE',
	0.9
)
const maxFcpMs = getNumberEnv('LIGHTHOUSE_MAX_FCP_MS', isCi ? 2_500 : 2_700)
const maxLcpMs = getNumberEnv('LIGHTHOUSE_MAX_LCP_MS', isCi ? 2_500 : 2_800)
const maxCls = getNumberEnv('LIGHTHOUSE_MAX_CLS', 0.1)

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer(url, timeoutMs = 45_000) {
	const start = Date.now()

	while (Date.now() - start < timeoutMs) {
		try {
			const response = await fetch(url)
			if (response.ok) {
				return
			}
		} catch {
			// Keep retrying until timeout.
		}

		await sleep(500)
	}

	throw new Error(
		`Preview server did not become ready at ${url} within ${timeoutMs}ms`
	)
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const previewServer = spawn(
	npmCommand,
	['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'],
	{
		stdio: 'inherit'
	}
)

let chrome

try {
	await waitForServer(baseUrl)

	chrome = await launch({
		chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage']
	})

	const result = await lighthouse(baseUrl, {
		port: chrome.port,
		output: 'json',
		logLevel: 'error',
		onlyCategories: ['performance']
	})

	const performanceScore = result?.lhr?.categories?.performance?.score ?? 0
	const fcpMs =
		result?.lhr?.audits?.['first-contentful-paint']?.numericValue ?? Infinity
	const lcpMs =
		result?.lhr?.audits?.['largest-contentful-paint']?.numericValue ?? Infinity
	const cls =
		result?.lhr?.audits?.['cumulative-layout-shift']?.numericValue ?? Infinity
	const formattedScore = Math.round(performanceScore * 100)
	const minFormattedScore = Math.round(minPerformanceScore * 100)
	const formattedFcpMs = Math.round(fcpMs)
	const formattedLcpMs = Math.round(lcpMs)
	const formattedCls = Number(cls.toFixed(3))

	console.log(`Lighthouse performance score: ${formattedScore}`)
	console.log(`Lighthouse FCP: ${formattedFcpMs}ms`)
	console.log(`Lighthouse LCP: ${formattedLcpMs}ms`)
	console.log(`Lighthouse CLS: ${formattedCls}`)
	console.log(
		`Lighthouse thresholds: score>=${minPerformanceScore}, fcp<=${maxFcpMs}ms, lcp<=${maxLcpMs}ms, cls<=${maxCls}`
	)

	if (performanceScore < minPerformanceScore) {
		throw new Error(
			`Performance score ${formattedScore} is below required threshold ${minFormattedScore}`
		)
	}

	if (fcpMs > maxFcpMs) {
		throw new Error(
			`FCP ${formattedFcpMs}ms is above required threshold ${maxFcpMs}ms`
		)
	}

	if (lcpMs > maxLcpMs) {
		throw new Error(
			`LCP ${formattedLcpMs}ms is above required threshold ${maxLcpMs}ms`
		)
	}

	if (cls > maxCls) {
		throw new Error(`CLS ${formattedCls} is above required threshold ${maxCls}`)
	}
} finally {
	try {
		if (chrome) await chrome.kill()
	} catch {
		/* already exited */
	}
	try {
		previewServer.kill('SIGTERM')
	} catch {
		/* already exited */
	}
}
