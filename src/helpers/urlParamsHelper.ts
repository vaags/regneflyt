import { replaceState } from '$app/navigation'
import type { Quiz } from '../models/Quiz'
import { Operator } from '../models/constants/Operator'

let pendingTimeout: number | undefined

function debouncedReplaceState(nextUrl: string) {
	if (pendingTimeout) window.clearTimeout(pendingTimeout)
	pendingTimeout = window.setTimeout(() => {
		replaceState(nextUrl, {})
		pendingTimeout = undefined
	}, 50)
}

export function setUrlParams(quiz: Quiz) {
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
		throw new Error('Cannot sync URL: missing operator settings')
	}

	const parameters: Record<string, string> = {
		duration: quiz.duration.toString(),
		hideProgressBar: quiz.hidePuzzleProgressBar.toString(),
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
	if (!quiz.showSettings) parameters.showSettings = 'false'
	const nextUrl = `?${new URLSearchParams(parameters)}`

	debouncedReplaceState(nextUrl)
}

export function buildShareUrl(baseUrl: string, title: string): string {
	const url = new URL(baseUrl)
	url.searchParams.set('title', title)
	url.searchParams.set('showSettings', 'false')
	return url.origin + url.pathname + url.search.split('+').join('%20')
}
