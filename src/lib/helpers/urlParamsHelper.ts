import { replaceState } from '$app/navigation'
import type { Quiz } from '$lib/models/Quiz'
import { Operator } from '$lib/constants/Operator'
import { quizUrlQueryParamKeys } from '$lib/models/quizQuerySchema'
import { getQuizQueryRoutingPolicy } from '$lib/models/quizQueryRoutingPolicy'

let pendingTimeout: number | undefined

function debouncedReplaceState(nextUrl: string) {
	if (pendingTimeout) window.clearTimeout(pendingTimeout)
	pendingTimeout = window.setTimeout(() => {
		replaceState(nextUrl, {})
		pendingTimeout = undefined
	}, 50)
}

export function buildQuizParams(quiz: Quiz): URLSearchParams {
	const additionSettings = quiz.operatorSettings[Operator.Addition]
	const subtractionSettings = quiz.operatorSettings[Operator.Subtraction]
	const multiplicationSettings = quiz.operatorSettings[Operator.Multiplication]
	const divisionSettings = quiz.operatorSettings[Operator.Division]

	if (
		!additionSettings ||
		!subtractionSettings ||
		!multiplicationSettings ||
		!divisionSettings
	) {
		throw new Error('Cannot build quiz params: missing operator settings')
	}

	const parameters: Record<string, string> = {
		duration: quiz.duration.toString(),
		showProgressBar: quiz.showPuzzleProgressBar.toString(),
		operator: quiz.selectedOperator?.toString() ?? '',
		addMin: additionSettings.range[0].toString(),
		addMax: additionSettings.range[1].toString(),
		subMin: subtractionSettings.range[0].toString(),
		subMax: subtractionSettings.range[1].toString(),
		mulValues: multiplicationSettings.possibleValues.toString(),
		divValues: divisionSettings.possibleValues.toString(),
		puzzleMode: quiz.puzzleMode.toString(),
		difficulty: quiz.difficulty?.toString() ?? '',
		allowNegativeAnswers: quiz.allowNegativeAnswers.toString()
	}

	if (quiz.title) parameters.title = quiz.title

	return new URLSearchParams(parameters)
}

export function buildReplayParams(quiz: Quiz): URLSearchParams {
	const params = buildQuizParams(quiz)
	params.set('seed', quiz.seed.toString())
	params.set('replay', 'true')
	return params
}

export function setUrlParams(quiz: Quiz) {
	const nextUrl = `?${buildQuizParams(quiz)}`

	debouncedReplaceState(nextUrl)
}

export function filterQuizQueryParams(
	sourceQueryParams: URLSearchParams
): URLSearchParams {
	const filteredQueryParams = new URLSearchParams()

	for (const key of quizUrlQueryParamKeys) {
		for (const value of sourceQueryParams.getAll(key)) {
			filteredQueryParams.append(key, value)
		}
	}

	return filteredQueryParams
}

export function buildPathWithQuizQueryParams(
	path: string,
	sourceQueryParams: URLSearchParams,
	hash = ''
): string {
	const queryString =
		getQuizQueryRoutingPolicy(path) === 'canonical'
			? filterQuizQueryParams(sourceQueryParams).toString()
			: sourceQueryParams.toString()
	const pathWithQuery = queryString ? `${path}?${queryString}` : path
	return hash ? `${pathWithQuery}${hash}` : pathWithQuery
}

export function buildShareUrl(
	baseUrl: string,
	title: string,
	seed?: number
): string {
	const url = new URL(baseUrl)
	url.searchParams.set('title', title)
	if (seed !== undefined) {
		url.searchParams.set('seed', seed.toString())
	} else {
		url.searchParams.delete('seed')
	}
	return url.origin + url.pathname + url.search.split('+').join('%20')
}
