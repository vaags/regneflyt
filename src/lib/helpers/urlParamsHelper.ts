import { goto } from '$app/navigation'
import { Operator } from '#lib/constants/Operator.ts'
import type { Quiz } from '#lib/models/Quiz.ts'
import { quizUrlQueryParamKeys } from '#lib/models/quizQuerySchema.ts'
import { getQuizQueryRoutingPolicy } from '#lib/models/quizQueryRoutingPolicy.ts'

type TimerHandle = number | ReturnType<typeof setTimeout>

let pendingTimeout: TimerHandle | undefined

export type UrlSyncRuntime = {
	clearTimeout: (timeoutId: TimerHandle) => void
	setTimeout: (callback: () => void, timeoutMs: number) => TimerHandle
	replaceUrl: (nextUrl: string) => Promise<void>
}

const defaultUrlSyncRuntime: UrlSyncRuntime = {
	clearTimeout: (timeoutId) => {
		globalThis.clearTimeout(timeoutId)
	},
	setTimeout: (callback, timeoutMs) => {
		return globalThis.setTimeout(callback, timeoutMs)
	},
	replaceUrl: (nextUrl) => {
		return goto(nextUrl, { shallow: true, replace: true })
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

function restoreFocusAfterNavigation(focusTargetId: string | undefined): void {
	if (focusTargetId === undefined || typeof document === 'undefined') return

	const restoreFocus = (): void => {
		const focusTarget = document.getElementById(focusTargetId)
		if (focusTarget instanceof HTMLElement) {
			focusTarget.focus({ preventScroll: true })
		}
	}

	if (typeof requestAnimationFrame === 'undefined') {
		restoreFocus()
		return
	}

	requestAnimationFrame(restoreFocus)
}

function debouncedReplaceUrl(
	nextUrl: string,
	focusTargetId: string | undefined
): void {
	if (pendingTimeout !== undefined) urlSyncRuntime.clearTimeout(pendingTimeout)
	pendingTimeout = urlSyncRuntime.setTimeout(() => {
		pendingTimeout = undefined
		void urlSyncRuntime
			.replaceUrl(nextUrl)
			.then(() => {
				restoreFocusAfterNavigation(focusTargetId)
			})
			.catch(() => undefined)
	}, 50)
}

export function cancelPendingQuizUrlSync(): void {
	if (pendingTimeout === undefined) return

	urlSyncRuntime.clearTimeout(pendingTimeout)
	pendingTimeout = undefined
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

export function syncQuizUrlParams(
	quiz: Quiz,
	focusTargetId: string | undefined = undefined
): void {
	// Side-effect boundary: URL/history mutation is intentionally centralized here.
	const nextUrl = `?${buildQuizParams(quiz)}`

	debouncedReplaceUrl(nextUrl, focusTargetId)
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
