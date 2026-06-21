export const defaultMatrixSeeds = [1, 42, 99]

export const operatorOrder = [
	'addition',
	'subtraction',
	'multiplication',
	'division',
	'all'
] as const

export const reviewScopes = ['narrow', 'broad', 'foundational'] as const

export type OfflineAnalysisOperatorName = (typeof operatorOrder)[number]
export type OfflineAnalysisReviewScope = (typeof reviewScopes)[number]

const phases = ['early', 'mid', 'late'] as const

const operatorNameLookup: Record<OfflineAnalysisOperatorName, true> = {
	addition: true,
	subtraction: true,
	multiplication: true,
	division: true,
	all: true
}

const reviewScopeLookup: Record<OfflineAnalysisReviewScope, true> = {
	narrow: true,
	broad: true,
	foundational: true
}

export interface OfflineAnalysisCliOptions {
	out?: string
	title?: string
	seed?: number
	steps?: number
	seeds: number[]
	operators: OfflineAnalysisOperatorName[]
	compare: boolean
	matrix: boolean
	review: boolean
	preset?: string
	scope: OfflineAnalysisReviewScope
	baselineTuning?: string
	candidateTuning?: string
}

export interface PhaseSummaryDelta {
	steps: number
	correctCount: number
	incorrectCount: number
	meanSkillDelta: number
}

export interface PhaseCoverageSummary {
	early: number
	mid: number
	late: number
}

export interface MatrixPhaseSummaryRow {
	phaseCoverage: PhaseCoverageSummary
	phaseDelta: {
		early: PhaseSummaryDelta
		mid: PhaseSummaryDelta
		late: PhaseSummaryDelta
	}
}

function isOperatorName(value: string): value is OfflineAnalysisOperatorName {
	return Object.hasOwn(operatorNameLookup, value)
}

function isReviewScope(value: string): value is OfflineAnalysisReviewScope {
	return Object.hasOwn(reviewScopeLookup, value)
}

function parseNumericList(value?: string): {
	values: number[]
	invalid: string[]
} {
	if (value === undefined || value.length === 0) {
		return { values: [], invalid: [] }
	}

	const values: number[] = []
	const invalid: string[] = []
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

function parseOperatorList(value?: string): {
	values: OfflineAnalysisOperatorName[]
	invalid: string[]
} {
	if (value === undefined || value.length === 0) {
		return { values: [...operatorOrder], invalid: [] }
	}

	const values: OfflineAnalysisOperatorName[] = []
	const invalid: string[] = []
	for (const entry of value.split(',')) {
		const trimmed = entry.trim().toLowerCase()
		if (!trimmed) {
			continue
		}

		if (isOperatorName(trimmed)) {
			values.push(trimmed)
		} else {
			invalid.push(trimmed)
		}
	}

	return { values: Array.from(new Set(values)), invalid }
}

function createEmptyPhaseDeltaSummary(): MatrixPhaseSummaryRow['phaseDelta'] {
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

function createEmptyPhaseCoverageSummary(): PhaseCoverageSummary {
	return {
		early: 0,
		mid: 0,
		late: 0
	}
}

export function summarizePhaseDelta(
	rows: MatrixPhaseSummaryRow[]
): MatrixPhaseSummaryRow['phaseDelta'] {
	const totals = createEmptyPhaseDeltaSummary()

	for (const row of rows) {
		for (const phase of phases) {
			const summary = row.phaseDelta[phase]
			totals[phase].steps += summary.steps
			totals[phase].correctCount += summary.correctCount
			totals[phase].incorrectCount += summary.incorrectCount
			totals[phase].meanSkillDelta += summary.meanSkillDelta
		}
	}

	const runCount = rows.length || 1
	for (const phase of phases) {
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

export function summarizePhaseCoverage(
	rows: MatrixPhaseSummaryRow[]
): PhaseCoverageSummary {
	if (rows.length === 0) {
		return createEmptyPhaseCoverageSummary()
	}

	const minimums: PhaseCoverageSummary = {
		early: Number.POSITIVE_INFINITY,
		mid: Number.POSITIVE_INFINITY,
		late: Number.POSITIVE_INFINITY
	}

	for (const row of rows) {
		for (const phase of phases) {
			minimums[phase] = Math.min(minimums[phase], row.phaseCoverage[phase])
		}
	}

	return minimums
}

export function parseOfflineAnalysisCliArgs(
	argv: string[]
): OfflineAnalysisCliOptions {
	const requiredFlagValue = (flag: string, index: number): string => {
		const value = argv[index + 1]
		if (typeof value !== 'string' || value.startsWith('--')) {
			throw new Error(`Missing value for ${flag}`)
		}
		return value
	}

	const options: OfflineAnalysisCliOptions = {
		seeds: [...defaultMatrixSeeds],
		operators: [...operatorOrder],
		compare: false,
		matrix: false,
		review: false,
		scope: 'narrow'
	}

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === '--out') {
			options.out = requiredFlagValue(arg, index)
			index++
			continue
		}
		if (arg === '--title') {
			options.title = requiredFlagValue(arg, index)
			index++
			continue
		}
		if (arg === '--seed') {
			const rawSeed = requiredFlagValue(arg, index)
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
			const rawSteps = requiredFlagValue(arg, index)
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
			const rawSeeds = requiredFlagValue(arg, index)
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
			const rawOperators = requiredFlagValue(arg, index)
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
			options.preset = requiredFlagValue(arg, index)
			index++
			continue
		}
		if (arg === '--scope') {
			const rawScope = requiredFlagValue(arg, index)
			if (!isReviewScope(rawScope)) {
				throw new Error(
					`Unknown --scope value ${String(rawScope)}. Use one of ${reviewScopes.join(', ')}.`
				)
			}
			options.scope = rawScope
			index++
			continue
		}
		if (arg === '--baseline-tuning') {
			options.baselineTuning = requiredFlagValue(arg, index)
			index++
			continue
		}
		if (arg === '--candidate-tuning') {
			options.candidateTuning = requiredFlagValue(arg, index)
			index++
			continue
		}
	}

	return options
}
