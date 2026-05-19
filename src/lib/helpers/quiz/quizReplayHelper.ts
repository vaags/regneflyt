import { goto } from '$app/navigation'
import { buildReplayQuizPath } from '$lib/helpers/quiz/quizPathHelper'
import type { LastResults } from '$lib/stores'

export function hasReplayableResults(
	results: LastResults | null | undefined
): boolean {
	return Boolean(results?.puzzleSet.length)
}

export function replayLastResults(
	results: LastResults | null | undefined
): void {
	const replayPath = buildReplayQuizPath(results)
	if (replayPath === undefined) return
	void goto(replayPath)
}
