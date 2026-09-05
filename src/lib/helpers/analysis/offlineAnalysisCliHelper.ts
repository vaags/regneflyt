import { Command, InvalidArgumentError, Option } from 'commander'

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

type OfflineAnalysisReviewPreset = {
	steps: number
	seeds: number[]
	operators: OfflineAnalysisOperatorName[]
	matrix: true
	scope: OfflineAnalysisReviewScope
}

const reviewPresets: Record<string, OfflineAnalysisReviewPreset> = {
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

const operatorNameLookup: Record<OfflineAnalysisOperatorName, true> = {
	addition: true,
	subtraction: true,
	multiplication: true,
	division: true,
	all: true
}

function isOperatorName(value: string): value is OfflineAnalysisOperatorName {
	return Object.hasOwn(operatorNameLookup, value)
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
	help?: boolean
	preset?: string
	scope: OfflineAnalysisReviewScope
	baselineTuning?: string
	candidateTuning?: string
}

export interface OfflineAnalysisExecutionOptions {
	seeds: number[]
	operators: OfflineAnalysisOperatorName[]
	matrix: boolean
	preset?: string
	scope: OfflineAnalysisReviewScope
	steps?: number
}

function parseFiniteNumber(
	value: string,
	option: '--seed' | '--steps'
): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed)) {
		const example = option === '--seed' ? '42' : '100'
		throw new InvalidArgumentError(
			`Invalid ${option} value ${value}. Use a number like ${example}.`
		)
	}
	return parsed
}

function parseRequiredText(value: string, option: string): string {
	if (value.startsWith('--')) {
		throw new InvalidArgumentError(`Missing value for ${option}`)
	}
	return value
}

function parseSteps(value: string): number {
	return Math.max(1, Math.floor(parseFiniteNumber(value, '--steps')))
}

function parseSeeds(value: string): number[] {
	const seeds: number[] = []
	for (const entry of value.split(',')) {
		const trimmed = entry.trim()
		if (!trimmed) continue

		const seed = Number(trimmed)
		if (!Number.isFinite(seed)) {
			throw new InvalidArgumentError(
				`Invalid --seeds value ${value}. Use comma-separated numbers like 1,42,99.`
			)
		}
		seeds.push(seed)
	}

	if (seeds.length === 0) {
		throw new InvalidArgumentError(
			`Invalid --seeds value ${value}. Use comma-separated numbers like 1,42,99.`
		)
	}
	return seeds
}

function parseOperators(value: string): OfflineAnalysisOperatorName[] {
	const operators: OfflineAnalysisOperatorName[] = []
	for (const entry of value.split(',')) {
		const operator = entry.trim().toLowerCase()
		if (!operator) continue

		if (!isOperatorName(operator)) {
			throw new InvalidArgumentError(
				`Unknown operator(s) in --operators ${value}. Use one or more of addition, subtraction, multiplication, division, all.`
			)
		}
		if (!operators.includes(operator)) operators.push(operator)
	}

	if (operators.length === 0) {
		throw new InvalidArgumentError(
			`Unknown operator(s) in --operators ${value}. Use one or more of addition, subtraction, multiplication, division, all.`
		)
	}
	return operators
}

function createOfflineAnalysisCommand(): Command {
	return new Command()
		.name('offline-analysis')
		.description(
			'Run deterministic adaptive-model analysis and tuning comparisons.'
		)
		.usage('[options]')
		.helpOption(false)
		.allowExcessArguments(false)
		.option('--out <path>', 'write reports to this path', (value) =>
			parseRequiredText(value, '--out')
		)
		.option('--title <title>', 'set the scenario and report title', (value) =>
			parseRequiredText(value, '--title')
		)
		.option('--seed <number>', 'set the deterministic seed', (value) =>
			parseFiniteNumber(value, '--seed')
		)
		.option(
			'--steps <number>',
			'set the number of simulation steps',
			parseSteps
		)
		.option('--seeds <list>', 'set comma-separated matrix seeds', parseSeeds, [
			...defaultMatrixSeeds
		])
		.option(
			'--operators <list>',
			'set comma-separated matrix operators',
			parseOperators,
			[...operatorOrder]
		)
		.option('--compare', 'compare baseline and candidate tuning', false)
		.option('-h, --help', 'display help for command')
		.addOption(
			new Option('--matrix', 'run a multi-seed, multi-operator comparison')
				.default(false)
				.implies({ compare: true })
		)
		.option('--review', 'emit an advisory progression review', false)
		.option(
			'--preset <name>',
			'use a review preset: early-game, foundational, penalty',
			(value) => parseRequiredText(value, '--preset')
		)
		.addOption(
			new Option('--scope <scope>', 'set the review scope')
				.choices(reviewScopes)
				.default('narrow')
		)
		.option('--baseline-tuning <path>', 'read baseline tuning JSON', (value) =>
			parseRequiredText(value, '--baseline-tuning')
		)
		.option(
			'--candidate-tuning <path>',
			'read candidate tuning JSON',
			(value) => parseRequiredText(value, '--candidate-tuning')
		)
		.exitOverride()
		.configureOutput({
			writeErr: () => {},
			outputError: () => {}
		})
}

export function getOfflineAnalysisCliHelp(): string {
	return createOfflineAnalysisCommand().helpInformation()
}

export function parseOfflineAnalysisCliArgs(
	argv: string[]
): OfflineAnalysisCliOptions {
	const command = createOfflineAnalysisCommand()
	command.parse(argv, { from: 'user' })
	return command.opts<OfflineAnalysisCliOptions>()
}

function hasTuningFiles(options: OfflineAnalysisCliOptions): boolean {
	return (
		options.baselineTuning !== undefined &&
		options.baselineTuning !== '' &&
		options.candidateTuning !== undefined &&
		options.candidateTuning !== ''
	)
}

export function resolveOfflineAnalysisExecutionOptions(
	options: OfflineAnalysisCliOptions
): OfflineAnalysisExecutionOptions {
	if (options.preset !== undefined && !options.review) {
		throw new Error('--preset can only be used with analyze:review')
	}

	let seeds = [...options.seeds]
	let operators = [...options.operators]
	let matrix = options.matrix
	let scope = options.scope
	let steps = options.steps

	if (options.review && options.preset !== undefined) {
		const preset = reviewPresets[options.preset]
		if (preset === undefined) {
			throw new Error(
				`Unknown preset: ${options.preset}. Use one of ${Object.keys(reviewPresets).join(', ')}`
			)
		}

		seeds = [...preset.seeds]
		operators = [...preset.operators]
		matrix = preset.matrix
		scope = preset.scope
		steps = preset.steps
	}

	if (options.review && !matrix && !options.compare) {
		throw new Error(
			'--review requires --compare or --matrix. For most tuning reviews, start with --preset early-game, --preset foundational, or --preset penalty. Use --compare or --matrix directly only when you need manual control, and always pair them with --baseline-tuning and --candidate-tuning.'
		)
	}

	if (matrix && !hasTuningFiles(options)) {
		throw new Error(
			'Matrix mode requires --baseline-tuning and --candidate-tuning'
		)
	}

	if (!matrix && options.compare && !hasTuningFiles(options)) {
		throw new Error(
			'Compare mode requires --baseline-tuning and --candidate-tuning'
		)
	}

	return {
		seeds,
		operators,
		matrix,
		scope,
		...(options.preset === undefined ? {} : { preset: options.preset }),
		...(steps === undefined ? {} : { steps })
	}
}
