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
	const parameters = {
		duration: quiz.duration.toString(),
		timeLimit: quiz.puzzleTimeLimit ? '3' : '0', // Saved as int for backward compatibility
		operator: quiz.selectedOperator?.toString() ?? '',
		addMin: quiz.operatorSettings[Operator.Addition].range[0]?.toString(),
		addMax: quiz.operatorSettings[Operator.Addition].range[1]?.toString(),
		subMin: quiz.operatorSettings[Operator.Subtraction].range[0]?.toString(),
		subMax: quiz.operatorSettings[Operator.Subtraction].range[1]?.toString(),
		mulValues:
			quiz.operatorSettings[
				Operator.Multiplication
			].possibleValues?.toString() ?? '',
		divValues:
			quiz.operatorSettings[Operator.Division].possibleValues?.toString() ?? '',
		puzzleMode: quiz.puzzleMode.toString(),
		difficulty: quiz.difficulty?.toString() ?? '',
		allowNegativeAnswers: quiz.allowNegativeAnswers.toString()
	}
	const nextUrl = `?${new URLSearchParams(parameters)}`

	if (urlSyncRetryTimeout) window.clearTimeout(urlSyncRetryTimeout)
	syncUrlWithRetry(nextUrl)
}
