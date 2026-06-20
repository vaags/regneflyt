import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
	const options = {
		out: undefined,
		title: undefined,
		seed: undefined,
		compare: false,
		baselineTuning: undefined,
		candidateTuning: undefined
	}

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === '--out') {
			options.out = argv[index + 1]
			index++
			continue
		}
		if (arg === '--title') {
			options.title = argv[index + 1]
			index++
			continue
		}
		if (arg === '--seed') {
			const seedValue = Number(argv[index + 1])
			options.seed = Number.isFinite(seedValue) ? seedValue : undefined
			index++
			continue
		}
		if (arg === '--compare') {
			options.compare = true
			continue
		}
		if (arg === '--baseline-tuning') {
			options.baselineTuning = argv[index + 1]
			index++
			continue
		}
		if (arg === '--candidate-tuning') {
			options.candidateTuning = argv[index + 1]
			index++
			continue
		}
	}

	return options
}

const { out, title, seed, compare, baselineTuning, candidateTuning } =
	parseArgs(process.argv.slice(2))
const {
	createDefaultOfflineScenario,
	formatOfflineAnalysisComparison,
	formatOfflineAnalysisReport,
	loadTuningSnapshot,
	compareOfflineAnalysisResults,
	runOfflineAnalysis
} = await import('../src/lib/helpers/analysis/offlineAnalysisHelper.ts')

const scenario = createDefaultOfflineScenario()
if (title) scenario.title = title
if (typeof seed === 'number') scenario.seed = seed

function readJsonFile(filePath) {
	const resolvedPath = path.resolve(filePath)
	return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
}

let report

if (compare) {
	if (!baselineTuning || !candidateTuning) {
		throw new Error(
			'Compare mode requires --baseline-tuning and --candidate-tuning'
		)
	}
	const baselineScenario = {
		...scenario,
		title: `${scenario.title}-baseline`,
		tuning: loadTuningSnapshot(readJsonFile(baselineTuning))
	}
	const candidateScenario = {
		...scenario,
		title: `${scenario.title}-candidate`,
		tuning: loadTuningSnapshot(readJsonFile(candidateTuning))
	}
	const baselineResult = runOfflineAnalysis(baselineScenario)
	const candidateResult = runOfflineAnalysis(candidateScenario)
	const comparison = compareOfflineAnalysisResults(
		baselineResult,
		candidateResult
	)
	report = formatOfflineAnalysisComparison(comparison)
	console.log(report)
	if (out) {
		const resolvedOut = path.resolve(out)
		fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
		fs.writeFileSync(resolvedOut, `${report}\n`, 'utf8')
	}
	process.exitCode = 0
} else {
	const result = runOfflineAnalysis(scenario)
	report = formatOfflineAnalysisReport(result)

	console.log(report)

	if (out) {
		const resolvedOut = path.resolve(out)
		fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
		fs.writeFileSync(resolvedOut, `${report}\n`, 'utf8')
	}
}
