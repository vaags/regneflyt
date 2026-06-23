import fs from 'node:fs'
import path from 'node:path'
import {
	defaultMatrixSeeds,
	operatorOrder,
	parseOfflineAnalysisCliArgs
} from '../src/lib/helpers/analysis/offlineAnalysisCliHelper.ts'
import {
	buildComparisonReviewArtifact,
	buildMatrixReviewArtifact,
	formatComparisonWithDecision,
	formatMatrixReport,
	resolveComparisonPhaseCoverage,
	summarizeMatrix
} from '../src/lib/helpers/analysis/offlineAnalysisReviewArtifactHelper.ts'

const {
	out,
	title,
	seed,
	steps,
	seeds,
	operators,
	compare,
	matrix,
	review,
	preset,
	scope,
	baselineTuning,
	candidateTuning
} = parseOfflineAnalysisCliArgs(process.argv.slice(2))
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
if (typeof steps === 'number') scenario.steps = steps

if (preset && !review) {
	throw new Error('--preset can only be used with analyze:review')
}

const reviewPresets = {
	'early-game': {
		steps: 50,
		seeds: [1, 42],
		operators: ['addition', 'subtraction'],
		matrix: true,
		scope: 'narrow'
	},
	foundational: {
		steps: 100,
		seeds: [...defaultMatrixSeeds],
		operators: [...operatorOrder],
		matrix: true,
		scope: 'foundational'
	},
	penalty: {
		steps: 150,
		seeds: [...defaultMatrixSeeds],
		operators: [...operatorOrder],
		matrix: true,
		scope: 'broad'
	}
}

let effectiveSeeds = [...seeds]
let effectiveOperators = [...operators]
let effectiveMatrix = matrix
let effectivePreset = preset
let effectiveScope = scope

if (review && preset) {
	const presetConfig = reviewPresets[preset]
	if (!presetConfig) {
		throw new Error(
			`Unknown preset: ${preset}. Use one of ${Object.keys(reviewPresets).join(', ')}`
		)
	}
	effectiveSeeds = [...presetConfig.seeds]
	effectiveOperators = [...presetConfig.operators]
	effectiveMatrix = presetConfig.matrix
	effectiveScope = presetConfig.scope
	scenario.steps = presetConfig.steps
}

if (review && !effectiveMatrix && !compare) {
	throw new Error(
		'--review requires --compare or --matrix. For most tuning reviews, start with --preset early-game, --preset foundational, or --preset penalty. Use --compare or --matrix directly only when you need manual control, and always pair them with --baseline-tuning and --candidate-tuning.'
	)
}

const operatorNameToValue = {
	addition: OperatorExtended.Addition,
	subtraction: OperatorExtended.Subtraction,
	multiplication: OperatorExtended.Multiplication,
	division: OperatorExtended.Division,
	all: OperatorExtended.All
}

const analysisArtifactsRoot = 'analysis-artifacts'
const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-')

function resolveAutoOutPath(mode) {
	if (out) {
		return out
	}

	return path.join(analysisArtifactsRoot, `${mode}-${runTimestamp}.txt`)
}

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
	if (!baselineTuning || !candidateTuning) {
		throw new Error(
			'Matrix mode requires --baseline-tuning and --candidate-tuning'
		)
	}
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
		const resolvedOut = resolveAutoOutPath('review-matrix')
		report = reviewArtifact.text
		emitReviewArtifact(reviewArtifact, {
			out: resolvedOut,
			label: 'matrix',
			emitInlineJson: !out
		})
	} else {
		report = formatMatrixReport(summary)
		console.log(report)

		const resolvedOut = path.resolve(resolveAutoOutPath('matrix'))
		const matrixPayload = {
			rows,
			summary,
			seeds,
			operators,
			steps: scenario.steps
		}
		writeReport(resolvedOut, report)
		writeJsonReport(`${resolvedOut}.json`, matrixPayload)
		console.log(`Saved matrix text report to: ${resolvedOut}`)
		console.log(`Saved matrix JSON report to: ${resolvedOut}.json`)
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
	if (review) {
		const reviewArtifact = buildComparisonReviewArtifact(comparison, {
			preset: effectivePreset,
			scope: effectiveScope
		})
		const resolvedOut = resolveAutoOutPath('review-compare')
		report = reviewArtifact.text
		emitReviewArtifact(reviewArtifact, {
			out: resolvedOut,
			label: 'comparison',
			emitInlineJson: !out
		})
	} else {
		report = formatComparisonWithDecision(comparison)
		console.log(report)
		const resolvedOut = resolveAutoOutPath('compare')
		writeReport(resolvedOut, report)
		console.log(`Saved comparison text report to: ${path.resolve(resolvedOut)}`)
	}
	process.exitCode = 0
} else {
	const result = runOfflineAnalysis(scenario)
	report = formatOfflineAnalysisReport(result)

	console.log(report)

	const resolvedOut = resolveAutoOutPath('offline')
	writeReport(resolvedOut, report)
	console.log(`Saved offline text report to: ${path.resolve(resolvedOut)}`)
}
