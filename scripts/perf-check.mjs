import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const baseUrl = 'http://127.0.0.1:4173/'
const isCi = process.env.CI === 'true'

function getNumberEnv(name, fallback) {
	const raw = process.env[name]
	if (!raw) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

function getIntegerEnv(name, fallback) {
	const parsed = Math.trunc(getNumberEnv(name, fallback))
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getBooleanEnv(name, fallback) {
	const raw = process.env[name]
	if (!raw) return fallback
	if (raw === '1' || raw.toLowerCase() === 'true') return true
	if (raw === '0' || raw.toLowerCase() === 'false') return false
	return fallback
}

function getPresetEnv() {
	const raw = (process.env.LIGHTHOUSE_PRESET ?? 'desktop').toLowerCase()
	if (raw === 'desktop' || raw === 'mobile') return raw
	throw new Error(
		`Unsupported LIGHTHOUSE_PRESET value "${raw}". Use "desktop" or "mobile".`
	)
}

const minPerformanceScore = getNumberEnv(
	'LIGHTHOUSE_MIN_PERFORMANCE_SCORE',
	0.9
)
const maxFcpMs = getNumberEnv('LIGHTHOUSE_MAX_FCP_MS', isCi ? 2_500 : 2_700)
const maxLcpMs = getNumberEnv('LIGHTHOUSE_MAX_LCP_MS', isCi ? 2_500 : 2_800)
const maxCls = getNumberEnv('LIGHTHOUSE_MAX_CLS', 0.1)
const runCount = getIntegerEnv('LIGHTHOUSE_RUNS', 3)
const preset = getPresetEnv()
const disableTelemetryInAudits = getBooleanEnv(
	'LIGHTHOUSE_DISABLE_TELEMETRY',
	true
)

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function getAvailablePort() {
	return new Promise((resolve, reject) => {
		const server = createServer()

		server.unref()
		server.on('error', reject)
		server.listen(0, '127.0.0.1', () => {
			const address = server.address()
			if (address == null || typeof address === 'string') {
				server.close()
				reject(new Error('Failed to allocate an available debugging port'))
				return
			}

			server.close((error) => {
				if (error) {
					reject(error)
					return
				}

				resolve(address.port)
			})
		})
	})
}

function median(values) {
	if (values.length === 0) return Infinity
	const sorted = [...values].sort((a, b) => a - b)
	const middle = Math.floor(sorted.length / 2)
	if (sorted.length % 2 === 0) {
		return (sorted[middle - 1] + sorted[middle]) / 2
	}
	return sorted[middle]
}

function getNestedItems(details) {
	if (!details || !Array.isArray(details.items)) return []
	if (details.items.length === 0) return []
	if (Array.isArray(details.items[0]?.items)) {
		return details.items[0].items
	}
	return details.items
}

function getRenderBlockingItems(audits) {
	const insight = audits['render-blocking-insight']
	if (insight) {
		return getNestedItems(insight.details)
	}

	const legacy = audits['render-blocking-resources']
	if (legacy) {
		return getNestedItems(legacy.details)
	}

	return []
}

function getLcpBreakdownBySubpart(audits) {
	const insight = audits['lcp-breakdown-insight']
	if (!insight) {
		return null
	}

	const items = getNestedItems(insight.details)
	const bySubpart = {
		timeToFirstByte: 0,
		resourceLoadDelay: 0,
		resourceLoadDuration: 0,
		elementRenderDelay: 0
	}

	for (const item of items) {
		if (typeof item?.subpart !== 'string') continue
		if (typeof item?.duration !== 'number') continue
		if (Object.hasOwn(bySubpart, item.subpart)) {
			bySubpart[item.subpart] = item.duration
		}
	}

	return bySubpart
}

function getPresetConfig() {
	if (preset === 'desktop') {
		return desktopConfig
	}

	// Lighthouse mobile config is the default config.
	return undefined
}

function getBlockedUrlPatterns() {
	if (!disableTelemetryInAudits) return []
	return [
		'*/_vercel/speed-insights/script.js*',
		'*/_vercel/insights/script.js*'
	]
}

function formatMs(value) {
	return `${Math.round(value)}ms`
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
	const chromePort = await getAvailablePort()

	chrome = await chromium.launch({
		headless: true,
		args: [
			`--remote-debugging-port=${chromePort}`,
			'--no-sandbox',
			'--disable-dev-shm-usage'
		]
	})
	const config = getPresetConfig()
	const blockedUrlPatterns = getBlockedUrlPatterns()
	const runResults = []

	for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
		const result = await lighthouse(
			baseUrl,
			{
				port: chromePort,
				output: 'json',
				logLevel: 'error',
				onlyCategories: ['performance'],
				blockedUrlPatterns
			},
			config
		)

		const audits = result?.lhr?.audits ?? {}
		const runData = {
			score: result?.lhr?.categories?.performance?.score ?? 0,
			fcpMs: audits['first-contentful-paint']?.numericValue ?? Infinity,
			lcpMs: audits['largest-contentful-paint']?.numericValue ?? Infinity,
			cls: audits['cumulative-layout-shift']?.numericValue ?? Infinity,
			tbtMs: audits['total-blocking-time']?.numericValue ?? Infinity,
			siMs: audits['speed-index']?.numericValue ?? Infinity,
			ttfbMs: audits['server-response-time']?.numericValue ?? Infinity,
			renderBlockingItems: getRenderBlockingItems(audits),
			lcpBreakdown: getLcpBreakdownBySubpart(audits)
		}

		runResults.push(runData)

		console.log(
			`Lighthouse run ${runIndex + 1}/${runCount} (${preset}): score=${Math.round(runData.score * 100)}, fcp=${formatMs(runData.fcpMs)}, lcp=${formatMs(runData.lcpMs)}, cls=${Number(runData.cls.toFixed(3))}, tbt=${formatMs(runData.tbtMs)}`
		)
	}

	const medianScore = median(runResults.map((run) => run.score))
	const medianFcpMs = median(runResults.map((run) => run.fcpMs))
	const medianLcpMs = median(runResults.map((run) => run.lcpMs))
	const medianCls = median(runResults.map((run) => run.cls))
	const medianTbtMs = median(runResults.map((run) => run.tbtMs))
	const medianSiMs = median(runResults.map((run) => run.siMs))
	const medianTtfbMs = median(runResults.map((run) => run.ttfbMs))
	const minFormattedScore = Math.round(minPerformanceScore * 100)

	const representativeRun = [...runResults]
		.sort(
			(a, b) =>
				Math.abs(a.lcpMs - medianLcpMs) - Math.abs(b.lcpMs - medianLcpMs)
		)
		.at(0)

	const renderBlockingTop = (representativeRun?.renderBlockingItems ?? [])
		.filter((item) => typeof item?.url === 'string')
		.sort((a, b) => (b.wastedMs ?? 0) - (a.wastedMs ?? 0))
		.slice(0, 3)

	console.log(
		`Lighthouse mode: preset=${preset}, runs=${runCount}, telemetryBlocked=${disableTelemetryInAudits}`
	)
	console.log(
		`Lighthouse performance score (median): ${Math.round(medianScore * 100)}`
	)
	console.log(`Lighthouse FCP (median): ${formatMs(medianFcpMs)}`)
	console.log(`Lighthouse LCP (median): ${formatMs(medianLcpMs)}`)
	console.log(`Lighthouse CLS (median): ${Number(medianCls.toFixed(3))}`)
	console.log(`Lighthouse TBT (median): ${formatMs(medianTbtMs)}`)
	console.log(`Lighthouse Speed Index (median): ${formatMs(medianSiMs)}`)
	console.log(`Lighthouse server response (median): ${formatMs(medianTtfbMs)}`)

	if (representativeRun?.lcpBreakdown) {
		const {
			timeToFirstByte,
			resourceLoadDelay,
			resourceLoadDuration,
			elementRenderDelay
		} = representativeRun.lcpBreakdown
		console.log(
			`LCP breakdown (representative run): ttfb=${formatMs(timeToFirstByte)}, resourceDelay=${formatMs(resourceLoadDelay)}, resourceLoad=${formatMs(resourceLoadDuration)}, renderDelay=${formatMs(elementRenderDelay)}`
		)
	}

	if (renderBlockingTop.length > 0) {
		console.log('Top render-blocking resources (representative run):')
		for (const item of renderBlockingTop) {
			console.log(
				`- ${item.url} (wasted=${formatMs(item.wastedMs ?? 0)}, bytes=${item.totalBytes ?? item.transferSize ?? 'n/a'})`
			)
		}
	}

	console.log(
		`Lighthouse thresholds: score>=${minPerformanceScore}, fcp<=${maxFcpMs}ms, lcp<=${maxLcpMs}ms, cls<=${maxCls}`
	)

	if (medianScore < minPerformanceScore) {
		throw new Error(
			`Performance score ${Math.round(medianScore * 100)} is below required threshold ${minFormattedScore}`
		)
	}

	if (medianFcpMs > maxFcpMs) {
		throw new Error(
			`FCP ${Math.round(medianFcpMs)}ms is above required threshold ${maxFcpMs}ms`
		)
	}

	if (medianLcpMs > maxLcpMs) {
		throw new Error(
			`LCP ${Math.round(medianLcpMs)}ms is above required threshold ${maxLcpMs}ms`
		)
	}

	if (medianCls > maxCls) {
		throw new Error(
			`CLS ${Number(medianCls.toFixed(3))} is above required threshold ${maxCls}`
		)
	}
} finally {
	try {
		if (chrome) await chrome.close()
	} catch {
		/* already exited */
	}
	try {
		previewServer.kill('SIGTERM')
	} catch {
		/* already exited */
	}
}
