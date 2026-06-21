import fs from 'node:fs'
import path from 'node:path'

const defaultMatrixSeeds = [1, 42, 99]
const operatorOrder = [
	'addition',
	'subtraction',
	'multiplication',
	'division',
	'all'
]

function parseNumericList(value) {
	if (!value) {
		return []
	}
	return value
		.split(',')
		.map((entry) => Number(entry.trim()))
		.filter((entry) => Number.isFinite(entry))
}

function parseOperatorList(value) {
	if (!value) {
		return [...operatorOrder]
	}
	const entries = value
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => operatorOrder.includes(entry))
	if (entries.length === 0) {
		return [...operatorOrder]
	}
	return Array.from(new Set(entries))
}

function parseArgs(argv) {
	const options = {
		out: undefined,
		title: undefined,
		seed: undefined,
		steps: undefined,
		seeds: [...defaultMatrixSeeds],
		operators: [...operatorOrder],
		compare: false,
		matrix: false,
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
		if (arg === '--steps') {
			const stepsValue = Number(argv[index + 1])
			options.steps = Number.isFinite(stepsValue)
				? Math.max(1, Math.floor(stepsValue))
				: undefined
			index++
			continue
		}
		if (arg === '--seeds') {
			const parsedSeeds = parseNumericList(argv[index + 1])
			if (parsedSeeds.length > 0) {
				options.seeds = parsedSeeds
			}
			index++
			continue
		}
		if (arg === '--operators') {
			options.operators = parseOperatorList(argv[index + 1])
			index++
			continue
		}
		if (arg === '--compare') {
			options.compare = true
			continue
		}
		if (arg === '--matrix') {
			options.matrix = true
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

const {
	out,
	title,
	seed,
	steps,
	seeds,
	operators,
	compare,
	matrix,
	baselineTuning,
	candidateTuning
} = parseArgs(process.argv.slice(2))
const {
	createDefaultOfflineScenario,
	formatOfflineAnalysisComparison,
	formatOfflineAnalysisReport,
	loadTuningSnapshot,
	compareOfflineAnalysisResults,
	runOfflineAnalysis
} = await import('../src/lib/helpers/analysis/offlineAnalysisHelper.ts')
const { OperatorExtended } = await import('../src/lib/constants/Operator.ts')

const scenario = createDefaultOfflineScenario()
if (title) scenario.title = title
if (typeof seed === 'number') scenario.seed = seed
if (typeof steps === 'number') scenario.steps = steps

const operatorNameToValue = {
	addition: OperatorExtended.Addition,
	subtraction: OperatorExtended.Subtraction,
	multiplication: OperatorExtended.Multiplication,
	division: OperatorExtended.Division,
	all: OperatorExtended.All
}

function writeReport(filePath, reportContent) {
	const resolvedOut = path.resolve(filePath)
	fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
	fs.writeFileSync(resolvedOut, `${reportContent}\n`, 'utf8')
}

function formatComparisonWithDecision(comparison) {
	const baseReport = formatOfflineAnalysisComparison(comparison)
	const accuracySignal =
		comparison.delta.correctCount > 0
			? 'higher-correctness'
			: comparison.delta.correctCount < 0
				? 'lower-correctness'
				: 'flat-correctness'
	const progressionSignal =
		comparison.delta.meanSkillDelta > 0
			? 'faster-progression'
			: comparison.delta.meanSkillDelta < 0
				? 'slower-progression'
				: 'flat-progression'
	return [
		baseReport,
		`Signal: ${accuracySignal}, ${progressionSignal}`,
		`Scope: seed=${comparison.baseline.scenario.seed}, steps=${comparison.baseline.steps}`
	].join('\n')
}

function summarizeMatrix(rows) {
	const grouped = new Map()
	for (const row of rows) {
		const current = grouped.get(row.operator) ?? {
			runs: 0,
			totalCorrectDelta: 0,
			totalIncorrectDelta: 0,
			totalMeanSkillDelta: 0,
			totalFinalSkillDelta: [0, 0, 0, 0]
		}
		current.runs += 1
		current.totalCorrectDelta += row.correctDelta
		current.totalIncorrectDelta += row.incorrectDelta
		current.totalMeanSkillDelta += row.meanSkillDelta
		for (let index = 0; index < row.finalSkillDelta.length; index += 1) {
			current.totalFinalSkillDelta[index] += row.finalSkillDelta[index]
		}
		grouped.set(row.operator, current)
	}

	const perOperator = []
	for (const operator of operatorOrder) {
		const value = grouped.get(operator)
		if (!value) {
			continue
		}
		perOperator.push({
			operator,
			runs: value.runs,
			avgCorrectDelta: Number(
				(value.totalCorrectDelta / value.runs).toFixed(2)
			),
			avgIncorrectDelta: Number(
				(value.totalIncorrectDelta / value.runs).toFixed(2)
			),
			avgMeanSkillDelta: Number(
				(value.totalMeanSkillDelta / value.runs).toFixed(4)
			),
			avgFinalSkillDelta: value.totalFinalSkillDelta.map((entry) =>
				Number((entry / value.runs).toFixed(2))
			)
		})
	}

	const totalRuns = rows.length
	const totalCorrectDelta = rows.reduce((sum, row) => sum + row.correctDelta, 0)
	const totalIncorrectDelta = rows.reduce(
		(sum, row) => sum + row.incorrectDelta,
		0
	)
	const totalMeanSkillDelta = rows.reduce(
		(sum, row) => sum + row.meanSkillDelta,
		0
	)

	return {
		overall: {
			runs: totalRuns,
			avgCorrectDelta: Number((totalCorrectDelta / totalRuns).toFixed(2)),
			avgIncorrectDelta: Number((totalIncorrectDelta / totalRuns).toFixed(2)),
			avgMeanSkillDelta: Number((totalMeanSkillDelta / totalRuns).toFixed(4))
		},
		perOperator
	}
}

function formatMatrixReport(summary) {
	const lines = [
		'Matrix comparison summary',
		`Runs: ${summary.overall.runs}`,
		`Overall correct delta: ${summary.overall.avgCorrectDelta}`,
		`Overall incorrect delta: ${summary.overall.avgIncorrectDelta}`,
		`Overall mean skill delta: ${summary.overall.avgMeanSkillDelta}`,
		''
	]

	for (const row of summary.perOperator) {
		lines.push(
			`${row.operator}: runs=${row.runs}, correct=${row.avgCorrectDelta}, incorrect=${row.avgIncorrectDelta}, meanSkill=${row.avgMeanSkillDelta}, finalSkills=${row.avgFinalSkillDelta.join(', ')}`
		)
	}

	const accuracySignal =
		summary.overall.avgCorrectDelta > 0
			? 'higher-correctness'
			: summary.overall.avgCorrectDelta < 0
				? 'lower-correctness'
				: 'flat-correctness'
	const progressionSignal =
		summary.overall.avgMeanSkillDelta > 0
			? 'faster-progression'
			: summary.overall.avgMeanSkillDelta < 0
				? 'slower-progression'
				: 'flat-progression'

	lines.push('')
	lines.push(`Signal: ${accuracySignal}, ${progressionSignal}`)

	return lines.join('\n')
}

function readJsonFile(filePath) {
	const resolvedPath = path.resolve(filePath)
	return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
}

let report

if (matrix) {
	if (!baselineTuning || !candidateTuning) {
		throw new Error(
			'Matrix mode requires --baseline-tuning and --candidate-tuning'
		)
	}
	const baselineSnapshot = loadTuningSnapshot(readJsonFile(baselineTuning))
	const candidateSnapshot = loadTuningSnapshot(readJsonFile(candidateTuning))
	const rows = []

	for (const matrixSeed of seeds) {
		for (const operatorName of operators) {
			const operator = operatorNameToValue[operatorName]
			const baselineScenario = {
				...scenario,
				seed: matrixSeed,
				operator,
				title: `${scenario.title}-${operatorName}-seed-${matrixSeed}-baseline`,
				tuning: baselineSnapshot
			}
			const candidateScenario = {
				...baselineScenario,
				title: `${scenario.title}-${operatorName}-seed-${matrixSeed}-candidate`,
				tuning: candidateSnapshot
			}
			const baselineResult = runOfflineAnalysis(baselineScenario)
			const candidateResult = runOfflineAnalysis(candidateScenario)
			const comparison = compareOfflineAnalysisResults(
				baselineResult,
				candidateResult
			)
			rows.push({
				seed: matrixSeed,
				operator: operatorName,
				correctDelta: comparison.delta.correctCount,
				incorrectDelta: comparison.delta.incorrectCount,
				meanSkillDelta: Number(comparison.delta.meanSkillDelta.toFixed(4)),
				finalSkillDelta: comparison.delta.finalSkills
			})
		}
	}

	const summary = summarizeMatrix(rows)
	report = formatMatrixReport(summary)
	console.log(report)

	if (out) {
		const resolvedOut = path.resolve(out)
		writeReport(resolvedOut, report)
		const jsonOut = `${resolvedOut}.json`
		writeReport(
			jsonOut,
			JSON.stringify(
				{ rows, summary, seeds, operators, steps: scenario.steps },
				null,
				2
			)
		)
		console.log(`Saved matrix text report to: ${resolvedOut}`)
		console.log(`Saved matrix JSON report to: ${jsonOut}`)
	}
	process.exitCode = 0
} else if (compare) {
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
	report = formatComparisonWithDecision(comparison)
	console.log(report)
	if (out) {
		writeReport(out, report)
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
