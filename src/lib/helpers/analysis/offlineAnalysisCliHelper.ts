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
		if (arg === undefined) {
			continue
		}

		switch (arg) {
			case '--out': {
				options.out = requiredFlagValue(arg, index)
				index++
				break
			}
			case '--title': {
				options.title = requiredFlagValue(arg, index)
				index++
				break
			}
			case '--seed': {
				const rawSeed = requiredFlagValue(arg, index)
				const seedValue = Number(rawSeed)
				if (!Number.isFinite(seedValue)) {
					throw new Error(
						`Invalid --seed value ${rawSeed}. Use a number like 42.`
					)
				}
				options.seed = seedValue
				index++
				break
			}
			case '--steps': {
				const rawSteps = requiredFlagValue(arg, index)
				const stepsValue = Number(rawSteps)
				if (!Number.isFinite(stepsValue)) {
					throw new Error(
						`Invalid --steps value ${rawSteps}. Use a positive number like 100.`
					)
				}
				options.steps = Math.max(1, Math.floor(stepsValue))
				index++
				break
			}
			case '--seeds': {
				const rawSeeds = requiredFlagValue(arg, index)
				const parsedSeeds = parseNumericList(rawSeeds)
				if (parsedSeeds.invalid.length > 0 || parsedSeeds.values.length === 0) {
					throw new Error(
						`Invalid --seeds value ${rawSeeds}. Use comma-separated numbers like 1,42,99.`
					)
				}
				options.seeds = parsedSeeds.values
				index++
				break
			}
			case '--operators': {
				const rawOperators = requiredFlagValue(arg, index)
				const parsedOperators = parseOperatorList(rawOperators)
				if (
					parsedOperators.invalid.length > 0 ||
					parsedOperators.values.length === 0
				) {
					throw new Error(
						`Unknown operator(s) in --operators ${rawOperators}. Use one or more of addition, subtraction, multiplication, division, all.`
					)
				}
				options.operators = parsedOperators.values
				index++
				break
			}
			case '--compare': {
				options.compare = true
				break
			}
			case '--matrix': {
				options.matrix = true
				options.compare = true
				break
			}
			case '--review': {
				options.review = true
				break
			}
			case '--preset': {
				options.preset = requiredFlagValue(arg, index)
				index++
				break
			}
			case '--scope': {
				const rawScope = requiredFlagValue(arg, index)
				if (!isReviewScope(rawScope)) {
					throw new Error(
						`Unknown --scope value ${rawScope}. Use one of ${reviewScopes.join(', ')}.`
					)
				}
				options.scope = rawScope
				index++
				break
			}
			case '--baseline-tuning': {
				options.baselineTuning = requiredFlagValue(arg, index)
				index++
				break
			}
			case '--candidate-tuning': {
				options.candidateTuning = requiredFlagValue(arg, index)
				index++
				break
			}
			default: {
				// Fail fast on unrecognized tokens: this is a flag-only CLI
				// (caller passes process.argv.slice(2)), so an unknown argument is
				// almost always a typo. Silently ignoring it would risk running with
				// a misleading configuration.
				throw new Error(
					`Unknown argument ${arg}. Use only recognized analyze:offline flags.`
				)
			}
		}
	}

	return options
}
