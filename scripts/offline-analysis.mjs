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
const reviewScopes = ['narrow', 'broad', 'foundational']

function parseNumericList(value) {
	if (!value) {
		return { values: [], invalid: [] }
	}
	const values = []
	const invalid = []
	for (const entry of value.split(',')) {
		const trimmed = entry.trim()
		if (!trimmed) {
			continue
		}
		const parsed = Number(trimmed)
		if (Number.isFinite(parsed)) {
			values.push(parsed)
		} else {
			invalid.push(trimmed)
		}
	}
	return { values, invalid }
}

function parseOperatorList(value) {
	if (!value) {
		return { values: [...operatorOrder], invalid: [] }
	}
	const values = []
	const invalid = []
	for (const entry of value.split(',')) {
		const trimmed = entry.trim().toLowerCase()
		if (!trimmed) {
			continue
		}
		if (operatorOrder.includes(trimmed)) {
			values.push(trimmed)
		} else {
			invalid.push(trimmed)
		}
	}
	return { values: Array.from(new Set(values)), invalid }
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
		review: false,
		preset: undefined,
		scope: 'narrow',
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
			const rawSeed = argv[index + 1]
			const seedValue = Number(rawSeed)
			if (!Number.isFinite(seedValue)) {
				throw new Error(
					`Invalid --seed value ${String(rawSeed)}. Use a number like 42.`
				)
			}
			options.seed = seedValue
			index++
			continue
		}
		if (arg === '--steps') {
			const rawSteps = argv[index + 1]
			const stepsValue = Number(rawSteps)
			if (!Number.isFinite(stepsValue)) {
				throw new Error(
					`Invalid --steps value ${String(rawSteps)}. Use a positive number like 100.`
				)
			}
			options.steps = Math.max(1, Math.floor(stepsValue))
			index++
			continue
		}
		if (arg === '--seeds') {
			const rawSeeds = argv[index + 1]
			const parsedSeeds = parseNumericList(rawSeeds)
			if (parsedSeeds.invalid.length > 0 || parsedSeeds.values.length === 0) {
				throw new Error(
					`Invalid --seeds value ${String(rawSeeds)}. Use comma-separated numbers like 1,42,99.`
				)
			}
			options.seeds = parsedSeeds.values
			index++
			continue
		}
		if (arg === '--operators') {
			const rawOperators = argv[index + 1]
			const parsedOperators = parseOperatorList(rawOperators)
			if (
				parsedOperators.invalid.length > 0 ||
				parsedOperators.values.length === 0
			) {
				throw new Error(
					`Unknown operator(s) in --operators ${String(rawOperators)}. Use one or more of addition, subtraction, multiplication, division, all.`
				)
			}
			options.operators = parsedOperators.values
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
		if (arg === '--review') {
			options.review = true
			continue
		}
		if (arg === '--preset') {
			options.preset = argv[index + 1]
			index++
			continue
		}
		if (arg === '--scope') {
			const rawScope = argv[index + 1]
			if (!reviewScopes.includes(rawScope)) {
				throw new Error(
					`Unknown --scope value ${String(rawScope)}. Use one of ${reviewScopes.join(', ')}.`
				)
			}
			options.scope = rawScope
			index++
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
	review,
	preset,
	scope,
	baselineTuning,
	candidateTuning
} = parseArgs(process.argv.slice(2))
const {
	createDefaultOfflineScenario,
	createOfflineAnalysisRecommendation,
	formatOfflineAnalysisRecommendation,
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
		'--review requires --compare or --matrix. Use --preset <name> to enable matrix mode, or pair --review with --compare and --baseline-tuning/--candidate-tuning.'
	)
}

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

function formatDecisionSignal(correctDelta, meanSkillDelta) {
	const accuracySignal =
		correctDelta > 0
			? 'higher-correctness'
			: correctDelta < 0
				? 'lower-correctness'
				: 'flat-correctness'
	const progressionSignal =
		meanSkillDelta > 0
			? 'faster-progression'
			: meanSkillDelta < 0
				? 'slower-progression'
				: 'flat-progression'

	return `Signal: ${accuracySignal}, ${progressionSignal}`
}

function formatPhaseSummaryLine(label, phaseSummary) {
	return `${label}: steps=${phaseSummary.steps}, correct=${phaseSummary.correctCount}, incorrect=${phaseSummary.incorrectCount}, meanSkill=${phaseSummary.meanSkillDelta.toFixed(2)}`
}

function formatPhaseDeltaLine(label, phaseSummary) {
	return `${label}: stepDelta=${phaseSummary.steps}, correctDelta=${phaseSummary.correctCount}, incorrectDelta=${phaseSummary.incorrectCount}, meanSkillDelta=${phaseSummary.meanSkillDelta.toFixed(2)}`
}

function createEmptyPhaseMap() {
	return {
		early: {
			steps: 0,
			correctCount: 0,
			incorrectCount: 0,
			meanSkillDelta: 0
		},
		mid: {
			steps: 0,
			correctCount: 0,
			incorrectCount: 0,
			meanSkillDelta: 0
		},
		late: {
			steps: 0,
			correctCount: 0,
			incorrectCount: 0,
			meanSkillDelta: 0
		}
	}
}

function summarizePhaseDelta(rows) {
	const totals = createEmptyPhaseMap()

	for (const row of rows) {
		for (const phase of Object.keys(totals)) {
			const summary = row.phaseDelta[phase]
			totals[phase].steps += summary.steps
			totals[phase].correctCount += summary.correctCount
			totals[phase].incorrectCount += summary.incorrectCount
			totals[phase].meanSkillDelta += summary.meanSkillDelta
		}
	}

	const runCount = rows.length || 1
	for (const phase of Object.keys(totals)) {
		totals[phase].steps = Number((totals[phase].steps / runCount).toFixed(2))
		totals[phase].correctCount = Number(
			(totals[phase].correctCount / runCount).toFixed(2)
		)
		totals[phase].incorrectCount = Number(
			(totals[phase].incorrectCount / runCount).toFixed(2)
		)
		totals[phase].meanSkillDelta = Number(
			(totals[phase].meanSkillDelta / runCount).toFixed(4)
		)
	}

	return totals
}

function createEmptyPhaseCoverageMap() {
	return {
		early: 0,
		mid: 0,
		late: 0
	}
}

function summarizePhaseCoverage(rows) {
	const minimums = {
		early: Number.POSITIVE_INFINITY,
		mid: Number.POSITIVE_INFINITY,
		late: Number.POSITIVE_INFINITY
	}

	for (const row of rows) {
		for (const phase of Object.keys(minimums)) {
			minimums[phase] = Math.min(minimums[phase], row.phaseCoverage[phase])
		}
	}

	if (rows.length === 0) {
		return createEmptyPhaseCoverageMap()
	}

	return {
		early: minimums.early,
		mid: minimums.mid,
		late: minimums.late
	}
}

function resolveComparisonPhaseCoverage(comparison) {
	return {
		early: Math.min(
			comparison.phaseSummaries.baseline.early.steps,
			comparison.phaseSummaries.candidate.early.steps
		),
		mid: Math.min(
			comparison.phaseSummaries.baseline.mid.steps,
			comparison.phaseSummaries.candidate.mid.steps
		),
		late: Math.min(
			comparison.phaseSummaries.baseline.late.steps,
			comparison.phaseSummaries.candidate.late.steps
		)
	}
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
		return
	}

	console.log('')
	console.log(JSON.stringify(reviewArtifact.payload, null, 2))
}

function formatComparisonWithDecision(comparison) {
	const baseReport = formatOfflineAnalysisComparison(comparison)
	return [
		baseReport,
		formatDecisionSignal(
			comparison.delta.correctCount,
			comparison.delta.meanSkillDelta
		),
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
		phaseCoverage: summarizePhaseCoverage(rows),
		phaseDelta: summarizePhaseDelta(rows),
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
		formatPhaseDeltaLine('Early phase delta', summary.phaseDelta.early),
		formatPhaseDeltaLine('Mid phase delta', summary.phaseDelta.mid),
		formatPhaseDeltaLine('Late phase delta', summary.phaseDelta.late),
		''
	]

	for (const row of summary.perOperator) {
		lines.push(
			`${row.operator}: runs=${row.runs}, correct=${row.avgCorrectDelta}, incorrect=${row.avgIncorrectDelta}, meanSkill=${row.avgMeanSkillDelta}, finalSkills=${row.avgFinalSkillDelta.join(', ')}`
		)
	}

	lines.push('')
	lines.push(
		formatDecisionSignal(
			summary.overall.avgCorrectDelta,
			summary.overall.avgMeanSkillDelta
		)
	)

	return lines.join('\n')
}

function buildComparisonReview(comparison, context) {
	const phaseCoverage = resolveComparisonPhaseCoverage(comparison)
	const recommendation = createOfflineAnalysisRecommendation({
		correctCountDelta: comparison.delta.correctCount,
		meanSkillDelta: comparison.delta.meanSkillDelta,
		evidenceClass: 'compare',
		changeScope: context.scope,
		phaseDelta: comparison.phaseDelta,
		reviewedStepCount: Math.min(
			comparison.baseline.steps,
			comparison.candidate.steps
		),
		phaseCoverage
	})
	const policyLine = recommendation.policy.broadChangePolicySatisfied
		? `Policy: evidence sufficient for ${context.scope} changes`
		: `Policy: matrix evidence required before approving ${context.scope} changes`

	return {
		text: [
			formatOfflineAnalysisComparison(comparison),
			'',
			formatOfflineAnalysisRecommendation(recommendation),
			context.preset ? `Preset: ${context.preset}` : undefined,
			`Scope: ${context.scope}`,
			`Evidence: compare, seed=${comparison.baseline.scenario.seed}, steps=${comparison.baseline.steps}`,
			policyLine,
			formatPhaseSummaryLine(
				'Baseline early phase summary',
				comparison.phaseSummaries.baseline.early
			),
			formatPhaseSummaryLine(
				'Baseline mid phase summary',
				comparison.phaseSummaries.baseline.mid
			),
			formatPhaseSummaryLine(
				'Baseline late phase summary',
				comparison.phaseSummaries.baseline.late
			),
			formatPhaseSummaryLine(
				'Candidate early phase summary',
				comparison.phaseSummaries.candidate.early
			),
			formatPhaseSummaryLine(
				'Candidate mid phase summary',
				comparison.phaseSummaries.candidate.mid
			),
			formatPhaseSummaryLine(
				'Candidate late phase summary',
				comparison.phaseSummaries.candidate.late
			),
			formatPhaseDeltaLine('Early phase delta', comparison.phaseDelta.early),
			formatPhaseDeltaLine('Mid phase delta', comparison.phaseDelta.mid),
			formatPhaseDeltaLine('Late phase delta', comparison.phaseDelta.late),
			`Key deltas: correct=${comparison.delta.correctCount}, incorrect=${comparison.delta.incorrectCount}, meanSkill=${comparison.delta.meanSkillDelta.toFixed(2)}`
		]
			.filter(Boolean)
			.join('\n'),
		payload: {
			mode: 'compare',
			preset: context.preset ?? null,
			evidence: {
				class: 'compare',
				changeScope: context.scope
			},
			policy: recommendation.policy,
			recommendation,
			comparison: {
				baseline: {
					title: comparison.baseline.scenario.title,
					seed: comparison.baseline.scenario.seed,
					steps: comparison.baseline.steps,
					phaseSummaries: comparison.phaseSummaries.baseline
				},
				candidate: {
					title: comparison.candidate.scenario.title,
					seed: comparison.candidate.scenario.seed,
					steps: comparison.candidate.steps,
					phaseSummaries: comparison.phaseSummaries.candidate
				}
			},
			delta: comparison.delta,
			phaseDelta: comparison.phaseDelta
		}
	}
}

function buildMatrixReview(summary, rows, context) {
	const operatorImbalanceNotes = summary.perOperator.filter(
		(row) => row.avgCorrectDelta < -1 || row.avgMeanSkillDelta < -0.05
	)
	const recommendation = createOfflineAnalysisRecommendation({
		correctCountDelta: summary.overall.avgCorrectDelta,
		meanSkillDelta: summary.overall.avgMeanSkillDelta,
		operatorImbalance: operatorImbalanceNotes.length > 0,
		evidenceClass: 'matrix',
		changeScope: context.scope,
		phaseDelta: summary.phaseDelta,
		reviewedStepCount: context.steps,
		phaseCoverage: summary.phaseCoverage
	})
	const policyLine = recommendation.policy.broadChangePolicySatisfied
		? `Policy: evidence sufficient for ${context.scope} changes`
		: `Policy: matrix evidence required before approving ${context.scope} changes`

	return {
		text: [
			formatMatrixReport(summary),
			'',
			formatOfflineAnalysisRecommendation(recommendation),
			context.preset ? `Preset: ${context.preset}` : undefined,
			`Scope: ${context.scope}`,
			`Evidence: matrix, seeds=${context.seeds.join(',')}, operators=${context.operators.join(',')}`,
			policyLine,
			formatPhaseDeltaLine('Early phase delta', summary.phaseDelta.early),
			formatPhaseDeltaLine('Mid phase delta', summary.phaseDelta.mid),
			formatPhaseDeltaLine('Late phase delta', summary.phaseDelta.late),
			`Key deltas: correct=${summary.overall.avgCorrectDelta}, incorrect=${summary.overall.avgIncorrectDelta}, meanSkill=${summary.overall.avgMeanSkillDelta}`,
			operatorImbalanceNotes.length > 0
				? `Operator imbalance: ${operatorImbalanceNotes
						.map(
							(row) =>
								`${row.operator} (correct=${row.avgCorrectDelta}, meanSkill=${row.avgMeanSkillDelta})`
						)
						.join('; ')}`
				: 'Operator imbalance: none'
		]
			.filter(Boolean)
			.join('\n'),
		payload: {
			mode: 'matrix',
			preset: context.preset ?? null,
			evidence: {
				class: 'matrix',
				changeScope: context.scope
			},
			policy: recommendation.policy,
			recommendation,
			summary,
			phaseDelta: summary.phaseDelta,
			rows,
			seeds: context.seeds,
			operators: context.operators,
			steps: context.steps,
			operatorImbalanceNotes: operatorImbalanceNotes.map((row) => ({
				operator: row.operator,
				avgCorrectDelta: row.avgCorrectDelta,
				avgMeanSkillDelta: row.avgMeanSkillDelta
			}))
		}
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
		const reviewArtifact = buildMatrixReview(summary, rows, {
			preset: effectivePreset,
			scope: effectiveScope,
			seeds: effectiveSeeds,
			operators: effectiveOperators,
			steps: scenario.steps
		})
		report = reviewArtifact.text
		emitReviewArtifact(reviewArtifact, { out, label: 'matrix' })
	} else {
		report = formatMatrixReport(summary)
		console.log(report)

		if (out) {
			const resolvedOut = path.resolve(out)
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
		const reviewArtifact = buildComparisonReview(comparison, {
			preset: effectivePreset,
			scope: effectiveScope
		})
		report = reviewArtifact.text
		emitReviewArtifact(reviewArtifact, { out, label: 'comparison' })
	} else {
		report = formatComparisonWithDecision(comparison)
		console.log(report)
		if (out) {
			writeReport(out, report)
		}
	}
	process.exitCode = 0
} else {
	const result = runOfflineAnalysis(scenario)
	report = formatOfflineAnalysisReport(result)

	console.log(report)

	if (out) {
		writeReport(out, report)
	}
}
