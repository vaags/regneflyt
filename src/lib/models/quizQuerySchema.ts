export type QuizUrlQuery = {
	duration: number | undefined
	showProgressBar: boolean
	difficulty: number | undefined
	allowNegativeAnswers: boolean
	mulValues: number[] | undefined
	divValues: number[] | undefined
	puzzleMode: number | undefined
	operator: number | undefined
	seed: number | undefined
	addMin: number | undefined
	addMax: number | undefined
	subMin: number | undefined
	subMax: number | undefined
}

export const quizUrlQueryParamKeys = [
	'duration',
	'showProgressBar',
	'difficulty',
	'allowNegativeAnswers',
	'mulValues',
	'divValues',
	'puzzleMode',
	'operator',
	'seed',
	'addMin',
	'addMax',
	'subMin',
	'subMax'
] as const satisfies readonly (keyof QuizUrlQuery)[]

type MissingQuizUrlQueryParamKeys = Exclude<
	keyof QuizUrlQuery,
	(typeof quizUrlQueryParamKeys)[number]
>

// Compile-time guard: fails if any QuizUrlQuery key is missing from quizUrlQueryParamKeys.
void ({} as const satisfies Record<MissingQuizUrlQueryParamKeys, never>)

function optionalParsedNumber(
	value: string | undefined,
	parseNumber: (value: string) => number
): number | undefined {
	if (value === undefined) return undefined
	const parsed = parseNumber(value)
	if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return undefined
	return parsed
}

function optionalStrictInt(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (!/^[+-]?\d+$/.test(trimmed)) return undefined
	return optionalParsedNumber(trimmed, (raw) => Number.parseInt(raw, 10))
}

function optionalStrictFloat(value: string | undefined): number | undefined {
	if (value === undefined) return undefined
	const trimmed = value.trim()
	if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) return undefined
	return optionalParsedNumber(trimmed, Number.parseFloat)
}

function boolParam(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined) return defaultValue
	return value !== 'false'
}

function numArrayParam(value: string | undefined): number[] | undefined {
	if (value === undefined || value === '' || value === 'null') return undefined

	const parsed = value
		.split(',')
		.map((entry) => entry.trim())
		.map((entry) => optionalStrictInt(entry))
		.filter((entry): entry is number => entry !== undefined)

	return parsed.length > 0 ? parsed : undefined
}

function param(urlParams: URLSearchParams, key: string): string | undefined {
	const value = urlParams.get(key)
	return value === null ? undefined : value
}

export function parseQuizUrlQuery(urlParams: URLSearchParams): QuizUrlQuery {
	const duration = param(urlParams, 'duration')
	const showProgressBar = param(urlParams, 'showProgressBar')
	const difficulty = param(urlParams, 'difficulty')
	const allowNegativeAnswers = param(urlParams, 'allowNegativeAnswers')
	const mulValues = param(urlParams, 'mulValues')
	const divValues = param(urlParams, 'divValues')
	const puzzleMode = param(urlParams, 'puzzleMode')
	const operator = param(urlParams, 'operator')
	const seed = param(urlParams, 'seed')
	const addMin = param(urlParams, 'addMin')
	const addMax = param(urlParams, 'addMax')
	const subMin = param(urlParams, 'subMin')
	const subMax = param(urlParams, 'subMax')

	return {
		duration: optionalStrictFloat(duration),
		showProgressBar: boolParam(showProgressBar, false),
		difficulty: optionalStrictInt(difficulty),
		allowNegativeAnswers: boolParam(allowNegativeAnswers, true),
		mulValues: numArrayParam(mulValues),
		divValues: numArrayParam(divValues),
		puzzleMode: optionalStrictInt(puzzleMode),
		operator: optionalStrictInt(operator),
		seed: optionalStrictInt(seed),
		addMin: optionalStrictInt(addMin),
		addMax: optionalStrictInt(addMax),
		subMin: optionalStrictInt(subMin),
		subMax: optionalStrictInt(subMax)
	}
}
