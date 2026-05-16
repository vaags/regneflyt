import { replaceState } from '$app/navigation'
import type { Quiz } from '$lib/models/Quiz'
import { Operator } from '$lib/constants/Operator'
import { quizUrlQueryParamKeys } from '$lib/models/quizQuerySchema'
import { getQuizQueryRoutingPolicy } from '$lib/models/quizQueryRoutingPolicy'

type TimerHandle = number | ReturnType<typeof setTimeout>

let pendingTimeout: TimerHandle | undefined
export const quizQueryUpdatedEventName = 'regneflyt:quiz-query-updated'

export type UrlSyncRuntime = {
	getLocationSearch: () => string
	clearTimeout: (timeoutId: TimerHandle) => void
	setTimeout: (callback: () => void, timeoutMs: number) => TimerHandle
	replaceState: (nextUrl: string) => void
	dispatchQuizQueryUpdated: (search: string) => void
}

const defaultUrlSyncRuntime: UrlSyncRuntime = {
	getLocationSearch: () => {
		if (typeof window === 'undefined') return ''
		try {
			return window.location.search
		} catch {
			return ''
		}
	},
	clearTimeout: (timeoutId) => {
		globalThis.clearTimeout(timeoutId)
	},
	setTimeout: (callback, timeoutMs) => {
		return globalThis.setTimeout(callback, timeoutMs)
	},
	replaceState: (nextUrl) => {
		replaceState(nextUrl, {})
	},
	dispatchQuizQueryUpdated: (search) => {
		if (typeof window === 'undefined') return
		if (
			typeof window.dispatchEvent === 'function' &&
			typeof CustomEvent === 'function'
		) {
			window.dispatchEvent(
				new CustomEvent<{ search: string }>(quizQueryUpdatedEventName, {
					detail: { search }
				})
			)
		}
	}
}

let urlSyncRuntime: UrlSyncRuntime = defaultUrlSyncRuntime

export function setUrlSyncRuntimeForTests(runtime: UrlSyncRuntime): () => void {
	const previousRuntime = urlSyncRuntime
	urlSyncRuntime = runtime
	return () => {
		urlSyncRuntime = previousRuntime
	}
}

function debouncedReplaceState(nextUrl: string): void {
	if (pendingTimeout !== undefined) urlSyncRuntime.clearTimeout(pendingTimeout)
	pendingTimeout = urlSyncRuntime.setTimeout(() => {
		urlSyncRuntime.replaceState(nextUrl)
		urlSyncRuntime.dispatchQuizQueryUpdated(urlSyncRuntime.getLocationSearch())
		pendingTimeout = undefined
	}, 50)
}

export function buildQuizParams(quiz: Quiz): URLSearchParams {
	const additionSettings = quiz.operatorSettings[Operator.Addition]
	const subtractionSettings = quiz.operatorSettings[Operator.Subtraction]
	const multiplicationSettings = quiz.operatorSettings[Operator.Multiplication]
	const divisionSettings = quiz.operatorSettings[Operator.Division]

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

	return new URLSearchParams(parameters)
}

export function buildReplayParams(quiz: Quiz): URLSearchParams {
	const params = buildQuizParams(quiz)
	params.set('seed', quiz.seed.toString())
	params.set('replay', 'true')
	return params
}

export function syncQuizUrlParams(quiz: Quiz): void {
	// Side-effect boundary: URL/history mutation is intentionally centralized here.
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

export function buildCopyLinkUrl(baseUrl: string, seed?: number): string {
	const url = new URL(baseUrl)
	if (seed !== undefined) {
		url.searchParams.set('seed', seed.toString())
	} else {
		url.searchParams.delete('seed')
	}
	return url.origin + url.pathname + url.search.split('+').join('%20')
}
