import { replaceState } from '$app/navigation'
import type { Quiz } from '../models/Quiz'
import { Operator } from '../models/constants/Operator'

let urlSyncRetryTimeout: number | undefined

function syncUrlWithRetry(nextUrl: string, retriesLeft = 20) {
	try {
		replaceState(nextUrl, {})
	} catch {
		if (retriesLeft <= 0) return
		urlSyncRetryTimeout = window.setTimeout(
			() => syncUrlWithRetry(nextUrl, retriesLeft - 1),
			50
		)
	}
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

	const parameters = {
		duration: quiz.duration.toString(),
		timeLimit: quiz.puzzleTimeLimit ? '3' : '0', // Saved as int for backward compatibility
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
	const nextUrl = `?${new URLSearchParams(parameters)}`

	if (urlSyncRetryTimeout) window.clearTimeout(urlSyncRetryTimeout)
	syncUrlWithRetry(nextUrl)
}
