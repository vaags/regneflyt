import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'

const immutableDir = path.resolve('.svelte-kit/output/client/_app/immutable')

// Budgets are calibrated against the measured build (April 2026) with tight headroom:
//   rawTotal ~344 kB, gzipTotal ~113 kB, gzipJs ~102 kB, gzipCss ~11.1 kB
// Keep thresholds close to current output so regressions are still caught reliably.
// CSS baseline: @tailwindcss/forms uses class strategy (form-{checkbox,radio,select} only),
// nav-panel shadow moved to named utility, dark-mode button/panel utilities retained.
const budgetKb = {
	rawTotal: 347,
	gzipTotal: 114,
	gzipJs: 103,
	gzipCss: 11.4
}

const perChunkGzipWarningKb = 40

if (!fs.existsSync(immutableDir)) {
	throw new Error(
		`Build output not found at ${immutableDir}. Run \"npm run build\" before checking bundle budget.`
	)
}

function walkFiles(dirPath) {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true })
	let result = []

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name)
		if (entry.isDirectory()) {
			result = result.concat(walkFiles(fullPath))
			continue
		}

		if (fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
			result.push(fullPath)
		}
	}

	return result
}

function formatKb(bytes) {
	return `${(bytes / 1024).toFixed(1)} kB`
}

const files = walkFiles(immutableDir)

// Accumulate metrics from files
const metrics = {
	rawJs: 0,
	rawCss: 0,
	gzipJs: 0,
	gzipCss: 0
}

const largeChunks = []

for (const filePath of files) {
	const content = fs.readFileSync(filePath)
	const gzipBytes = zlib.gzipSync(content, { level: 9 }).length

	if (gzipBytes / 1024 > perChunkGzipWarningKb) {
		largeChunks.push({
			file: path.relative(immutableDir, filePath),
			gzipBytes
		})
	}

	if (filePath.endsWith('.js')) {
		metrics.rawJs += content.length
		metrics.gzipJs += gzipBytes
	} else {
		metrics.rawCss += content.length
		metrics.gzipCss += gzipBytes
	}
}

// Compute summary metrics
const summary = {
	rawTotal: metrics.rawJs + metrics.rawCss,
	gzipTotal: metrics.gzipJs + metrics.gzipCss,
	gzipJs: metrics.gzipJs,
	gzipCss: metrics.gzipCss
}

console.log('Bundle budget check')
console.log(`- Files checked: ${files.length}`)

const reportItems = [
	{ label: 'Raw total', key: 'rawTotal' },
	{ label: 'Gzip total', key: 'gzipTotal' },
	{ label: 'Gzip JS', key: 'gzipJs' },
	{ label: 'Gzip CSS', key: 'gzipCss' }
]

for (const { label, key } of reportItems) {
	const bytes = summary[key]
	const budget = budgetKb[key]
	console.log(`- ${label}: ${formatKb(bytes)} (budget: ${budget} kB)`)
}

const failures = []
for (const [key, budget] of Object.entries(budgetKb)) {
	const bytes = summary[key]
	if (bytes / 1024 > budget) {
		failures.push(`${key} ${formatKb(bytes)} exceeds ${budget} kB`)
	}
}

if (failures.length) {
	console.error('\nBundle budget exceeded:')
	for (const failure of failures) {
		console.error(`- ${failure}`)
	}
	process.exit(1)
}

if (largeChunks.length) {
	console.warn(`\nPer-chunk warnings (>${perChunkGzipWarningKb} kB gzipped):`)
	for (const { file, gzipBytes } of largeChunks) {
		console.warn(`- ${file}: ${formatKb(gzipBytes)}`)
	}
}

console.log('\nBundle budget passed.')
