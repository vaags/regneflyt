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

function toKb(bytes) {
	return bytes / 1024
}

const files = walkFiles(immutableDir)

let rawJs = 0
let rawCss = 0
let gzipJs = 0
let gzipCss = 0

const largeChunks = []

for (const filePath of files) {
	const content = fs.readFileSync(filePath)
	const gzipBytes = zlib.gzipSync(content, { level: 9 }).length
	const gzipKb = toKb(gzipBytes)

	if (gzipKb > perChunkGzipWarningKb) {
		largeChunks.push({
			file: path.relative(immutableDir, filePath),
			gzipKb
		})
	}

	if (filePath.endsWith('.js')) {
		rawJs += content.length
		gzipJs += gzipBytes
	} else {
		rawCss += content.length
		gzipCss += gzipBytes
	}
}

const metrics = {
	rawTotal: toKb(rawJs + rawCss),
	gzipTotal: toKb(gzipJs + gzipCss),
	gzipJs: toKb(gzipJs),
	gzipCss: toKb(gzipCss)
}

const format = (value) => `${value.toFixed(1)} kB`

console.log('Bundle budget check')
console.log(`- Files checked: ${files.length}`)
console.log(
	`- Raw total: ${format(metrics.rawTotal)} (budget: ${budgetKb.rawTotal} kB)`
)
console.log(
	`- Gzip total: ${format(metrics.gzipTotal)} (budget: ${budgetKb.gzipTotal} kB)`
)
console.log(
	`- Gzip JS: ${format(metrics.gzipJs)} (budget: ${budgetKb.gzipJs} kB)`
)
console.log(
	`- Gzip CSS: ${format(metrics.gzipCss)} (budget: ${budgetKb.gzipCss} kB)`
)

const failures = []
for (const [key, budget] of Object.entries(budgetKb)) {
	if (metrics[key] > budget) {
		failures.push(`${key} ${format(metrics[key])} exceeds ${budget} kB`)
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
	for (const { file, gzipKb } of largeChunks) {
		console.warn(`- ${file}: ${format(gzipKb)}`)
	}
}

console.log('\nBundle budget passed.')
