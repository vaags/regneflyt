import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'

const immutableDir = path.resolve('.svelte-kit/output/client/_app/immutable')

const budgetKb = {
	rawTotal: 190,
	gzipTotal: 70,
	gzipJs: 60,
	gzipCss: 10
}

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

for (const filePath of files) {
	const content = fs.readFileSync(filePath)
	const gzipBytes = zlib.gzipSync(content, { level: 9 }).length

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

console.log('\nBundle budget passed.')
