import fs from 'node:fs'
import path from 'node:path'
import {
	getOfflineAnalysisCliHelp,
	parseOfflineAnalysisCliArgs,
	resolveOfflineAnalysisExecutionOptions,
	resolveOfflineAnalysisOutputPath
} from '../src/lib/helpers/analysis/offlineAnalysisCliHelper.ts'
import {
	buildComparisonReviewArtifact,
	buildMatrixReviewArtifact
} from '../src/lib/helpers/analysis/offlineAnalysisReviewArtifactHelper.ts'
import {
	resolveComparisonPhaseCoverage,
	summarizeMatrix
} from '../src/lib/helpers/analysis/offlineAnalysisMatrixHelper.ts'
import {
	formatComparisonWithDecision,
	formatMatrixReport
} from '../src/lib/helpers/analysis/offlineAnalysisReportFormatHelper.ts'

const argv = process.argv.slice(2)
const cliOptions = parseOfflineAnalysisCliArgs(argv)
if (cliOptions.help) {
	console.log(getOfflineAnalysisCliHelp())
	process.exit(0)
}

const { out, title, seed, compare, review, baselineTuning, candidateTuning } =
	cliOptions
const {
	seeds: effectiveSeeds,
	operators: effectiveOperators,
	matrix: effectiveMatrix,
	preset: effectivePreset,
	scope: effectiveScope,
	steps: effectiveSteps
} = resolveOfflineAnalysisExecutionOptions(cliOptions)
const {
	createDefaultOfflineScenario,
	formatOfflineAnalysisReport,
	loadTuningSnapshot,
	compareOfflineAnalysisResults,
	runOfflineAnalysis
} = await import('../src/lib/helpers/analysis/offlineAnalysisHelper.ts')
const { OperatorExtended } = await import('../src/lib/constants/Operator.ts')

const scenario = createDefaultOfflineScenario()
if (title) scenario.title = title
if (typeof seed === 'number') scenario.seed = seed
if (typeof effectiveSteps === 'number') scenario.steps = effectiveSteps

const operatorNameToValue = {
	addition: OperatorExtended.Addition,
	subtraction: OperatorExtended.Subtraction,
	multiplication: OperatorExtended.Multiplication,
	division: OperatorExtended.Division,
	all: OperatorExtended.All
}
const runStartedAt = new Date()

function writeReport(filePath, reportContent) {
	const resolvedOut = path.resolve(filePath)
	fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
	fs.writeFileSync(resolvedOut, `${reportContent}\n`, 'utf8')
}

function writeJsonReport(filePath, payload) {
	writeReport(filePath, JSON.stringify(payload, null, 2))
}

function writeReviewReports(filePath, reportContent, payload) {
	const resolvedOut = path.resolve(filePath)
	fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
	fs.writeFileSync(resolvedOut, `${reportContent}\n`, 'utf8')
	fs.writeFileSync(
		`${resolvedOut}.json`,
		`${JSON.stringify(payload, null, 2)}\n`,
		'utf8'
	)
}

function emitReviewArtifact(reviewArtifact, context) {
	console.log(reviewArtifact.text)
	if (context.out) {
		writeReviewReports(context.out, reviewArtifact.text, reviewArtifact.payload)
		console.log(
			`Saved ${context.label} text report to: ${path.resolve(context.out)}`
		)
		console.log(
			`Saved ${context.label} JSON report to: ${path.resolve(context.out)}.json`
		)
	}

	if (context.emitInlineJson) {
		console.log('')
		console.log(JSON.stringify(reviewArtifact.payload, null, 2))
	}
}

function readJsonFile(filePath) {
	const resolvedPath = path.resolve(filePath)
	try {
		return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			throw new Error(`Unable to read tuning file ${resolvedPath}: not found`)
		}
		if (error instanceof Error) {
			throw new Error(
				`Unable to read tuning file ${resolvedPath}: ${error.message}`
			)
		}
		throw error
	}
}

let report

if (effectiveMatrix) {
	const baselineSnapshot = loadTuningSnapshot(readJsonFile(baselineTuning))
	const candidateSnapshot = loadTuningSnapshot(readJsonFile(candidateTuning))
	const rows = []

	for (const matrixSeed of effectiveSeeds) {
		for (const operatorName of effectiveOperators) {
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
				finalSkillDelta: comparison.delta.finalSkills,
				phaseCoverage: resolveComparisonPhaseCoverage(comparison),
				phaseDelta: comparison.phaseDelta
			})
		}
	}

	const summary = summarizeMatrix(rows)
	if (review) {
		const reviewArtifact = buildMatrixReviewArtifact(summary, rows, {
			preset: effectivePreset,
			scope: effectiveScope,
			seeds: effectiveSeeds,
			operators: effectiveOperators,
			steps: scenario.steps
		})
		const resolvedOut = resolveOfflineAnalysisOutputPath(
			out,
			'review-matrix',
			runStartedAt
		)
		report = reviewArtifact.text
		emitReviewArtifact(reviewArtifact, {
			out: resolvedOut,
			label: 'matrix',
			emitInlineJson: !out
		})
	} else {
		report = formatMatrixReport(summary)
		console.log(report)

		const resolvedOut = path.resolve(
			resolveOfflineAnalysisOutputPath(out, 'matrix', runStartedAt)
		)
		const matrixPayload = {
			rows,
			summary,
			seeds: effectiveSeeds,
			operators: effectiveOperators,
			steps: scenario.steps
		}
		writeReport(resolvedOut, report)
		writeJsonReport(`${resolvedOut}.json`, matrixPayload)
		console.log(`Saved matrix text report to: ${resolvedOut}`)
		console.log(`Saved matrix JSON report to: ${resolvedOut}.json`)
	}
	process.exitCode = 0
} else if (compare) {
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
	if (review) {
		const reviewArtifact = buildComparisonReviewArtifact(comparison, {
			preset: effectivePreset,
			scope: effectiveScope
		})
		const resolvedOut = resolveOfflineAnalysisOutputPath(
			out,
			'review-compare',
			runStartedAt
		)
		report = reviewArtifact.text
		emitReviewArtifact(reviewArtifact, {
			out: resolvedOut,
			label: 'comparison',
			emitInlineJson: !out
		})
	} else {
		report = formatComparisonWithDecision(comparison)
		console.log(report)
		const resolvedOut = resolveOfflineAnalysisOutputPath(
			out,
			'compare',
			runStartedAt
		)
		writeReport(resolvedOut, report)
		console.log(`Saved comparison text report to: ${path.resolve(resolvedOut)}`)
	}
	process.exitCode = 0
} else {
	const result = runOfflineAnalysis(scenario)
	report = formatOfflineAnalysisReport(result)

	console.log(report)

	const resolvedOut = resolveOfflineAnalysisOutputPath(
		out,
		'offline',
		runStartedAt
	)
	writeReport(resolvedOut, report)
	console.log(`Saved offline text report to: ${path.resolve(resolvedOut)}`)
}
