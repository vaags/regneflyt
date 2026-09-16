import {
	tuningAnalysisOperators,
	type TuningAnalysisOperatorName
} from './tuningAnalysisTypes.ts'
import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'

export type TuningAnalysisCliOptions = {
	tuning?: string
	baseline?: string
	candidate?: string
	out?: string
	seeds: number[]
	operators: TuningAnalysisOperatorName[]
	steps: number
	accuracy: number
	responseSeconds: number
	startingSkills: OperatorSkillMap
	help: boolean
}

const defaults: Omit<
	TuningAnalysisCliOptions,
	'tuning' | 'baseline' | 'candidate' | 'out'
> = {
	seeds: [1, 42, 99],
	operators: [...tuningAnalysisOperators],
	steps: 100,
	accuracy: 0.7,
	responseSeconds: 3,
	startingSkills: [0, 0, 0, 0],
	help: false
}

const operatorLookup = {
	addition: true,
	subtraction: true,
	multiplication: true,
	division: true,
	all: true
} satisfies Record<TuningAnalysisOperatorName, true>

function isOperatorName(value: string): value is TuningAnalysisOperatorName {
	return Object.hasOwn(operatorLookup, value)
}

function parseRequiredValue(
	argv: string[],
	index: number,
	option: string
): string {
	const value = argv[index + 1]
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing value for ${option}`)
	}
	return value
}

function parseNumber(value: string, option: string): number {
	const parsed = Number(value)
	if (!Number.isFinite(parsed))
		throw new Error(`Invalid ${option} value: ${value}`)
	return parsed
}

function parseSeeds(value: string): number[] {
	const seeds = value
		.split(',')
		.filter(Boolean)
		.map((entry) => parseNumber(entry.trim(), '--seeds'))
	if (seeds.length === 0 || seeds.some((seed) => !Number.isSafeInteger(seed))) {
		throw new Error('--seeds must contain comma-separated safe integers')
	}
	return [...new Set(seeds)]
}

function parseOperators(value: string): TuningAnalysisOperatorName[] {
	const operators = value
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter(isOperatorName)
	if (
		operators.length === 0 ||
		operators.length !== value.split(',').filter(Boolean).length
	) {
		throw new Error(
			`--operators must contain one or more of: ${tuningAnalysisOperators.join(', ')}`
		)
	}
	return [...new Set(operators)]
}

function parseStartingSkills(value: string): OperatorSkillMap {
	const parsed = value
		.split(',')
		.map((entry) => parseNumber(entry.trim(), '--starting-skills'))
	if (parsed.length === 1) {
		const skill = parsed[0]
		if (skill === undefined || skill < 0 || skill > 100) {
			throw new Error('--starting-skills values must be between 0 and 100')
		}
		return [skill, skill, skill, skill]
	}
	if (parsed.length !== 4 || parsed.some((skill) => skill < 0 || skill > 100)) {
		throw new Error(
			'--starting-skills requires one value or four comma-separated values between 0 and 100'
		)
	}
	const [addition, subtraction, multiplication, division] = parsed
	if (
		addition === undefined ||
		subtraction === undefined ||
		multiplication === undefined ||
		division === undefined
	) {
		throw new Error('Invalid --starting-skills values')
	}
	return [addition, subtraction, multiplication, division]
}

export function parseTuningAnalysisArgs(
	argv: string[]
): TuningAnalysisCliOptions {
	const options: TuningAnalysisCliOptions = {
		...defaults,
		seeds: [...defaults.seeds],
		operators: [...defaults.operators],
		startingSkills: [...defaults.startingSkills]
	}

	for (let index = 0; index < argv.length; index += 1) {
		const option = argv[index]
		if (option === '--help' || option === '-h') {
			options.help = true
			continue
		}
		if (option === undefined) {
			throw new Error('Unexpected missing argument')
		}
		if (!option.startsWith('--')) {
			throw new Error(`Unexpected argument: ${String(option)}`)
		}

		const value = parseRequiredValue(argv, index, option)
		index += 1
		switch (option) {
			case '--tuning':
				options.tuning = value
				break
			case '--baseline':
				options.baseline = value
				break
			case '--candidate':
				options.candidate = value
				break
			case '--out':
				options.out = value
				break
			case '--seeds':
				options.seeds = parseSeeds(value)
				break
			case '--operators':
				options.operators = parseOperators(value)
				break
			case '--steps': {
				const steps = parseNumber(value, '--steps')
				if (!Number.isSafeInteger(steps) || steps < 1) {
					throw new Error('--steps must be a positive integer')
				}
				options.steps = steps
				break
			}
			case '--accuracy': {
				const accuracy = parseNumber(value, '--accuracy')
				if (accuracy < 0 || accuracy > 1) {
					throw new Error('--accuracy must be between 0 and 1')
				}
				options.accuracy = accuracy
				break
			}
			case '--response-seconds': {
				const responseSeconds = parseNumber(value, '--response-seconds')
				if (responseSeconds < 0) {
					throw new Error('--response-seconds must be non-negative')
				}
				options.responseSeconds = responseSeconds
				break
			}
			case '--starting-skills':
				options.startingSkills = parseStartingSkills(value)
				break
			default:
				throw new Error(`Unknown option: ${option}`)
		}
	}

	const hasComparisonInput =
		options.baseline !== undefined || options.candidate !== undefined
	if (options.tuning !== undefined && hasComparisonInput) {
		throw new Error(
			'--tuning cannot be combined with --baseline or --candidate'
		)
	}
	if (
		hasComparisonInput &&
		(options.baseline === undefined || options.candidate === undefined)
	) {
		throw new Error('Comparison mode requires both --baseline and --candidate')
	}

	return options
}

export function getTuningAnalysisHelp(): string {
	return `Usage: analyze-tuning [options]

Inspect deterministic adaptive-model progression or compare two tuning files.

Options:
  --tuning <path>           inspect one tuning file instead of repository defaults
  --baseline <path>         baseline tuning JSON for comparison mode
  --candidate <path>        candidate tuning JSON for comparison mode
  --seeds <list>            comma-separated seeds (default: 1,42,99)
  --operators <list>        addition,subtraction,multiplication,division,all
  --steps <number>          steps per run (default: 100)
  --accuracy <fraction>     deterministic answer accuracy from 0 to 1 (default: 0.7)
  --response-seconds <n>    fixed response time in seconds (default: 3)
  --starting-skills <list>  one skill for all operators or four comma-separated skills
  --out <path>              JSON artifact path (default: analysis-artifacts/tuning-<timestamp>.json)
  -h, --help                display help

Accuracy and response time are fixed simulation inputs, not predicted learner outcomes.`
}
