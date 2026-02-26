import { spawn } from 'node:child_process'
import process from 'node:process'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

const baseUrl = 'http://127.0.0.1:4173/'
const minPerformanceScore = 0.95
const maxLcpMs = 2_000

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
	const lcpMs =
		result?.lhr?.audits?.['largest-contentful-paint']?.numericValue ?? Infinity
	const formattedScore = Math.round(performanceScore * 100)
	const minFormattedScore = Math.round(minPerformanceScore * 100)
	const formattedLcpMs = Math.round(lcpMs)

	console.log(`Lighthouse performance score: ${formattedScore}`)
	console.log(`Lighthouse LCP: ${formattedLcpMs}ms`)

	if (performanceScore < minPerformanceScore) {
		throw new Error(
			`Performance score ${formattedScore} is below required threshold ${minFormattedScore}`
		)
	}

	if (lcpMs > maxLcpMs) {
		throw new Error(
			`LCP ${formattedLcpMs}ms is above required threshold ${maxLcpMs}ms`
		)
	}
} finally {
	if (chrome) {
		await chrome.kill()
	}

	previewServer.kill('SIGTERM')
}
