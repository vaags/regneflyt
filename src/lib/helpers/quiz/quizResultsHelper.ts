import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type { Puzzle } from '$lib/models/Puzzle'
import type { Quiz } from '$lib/models/Quiz'
import { adaptiveSkills, lastResults, quizHistory } from '$lib/stores'
import type { LastResults } from '$lib/stores'
import type { QuizHistoryEntrySnapshot } from '$lib/models/persistedStoreSchemas'
import { getQuizStats } from '../statsHelper'
import { buildQuizParams } from '../urlParamsHelper'
import { appendQuizHistoryEntry } from '../conceptHistoryHelper'

type PersistCompletedQuizDeps = {
	setAdaptiveSkills: (skills: AdaptiveSkillMap) => void
	setLastResults: (value: LastResults) => void
	appendQuizHistory: (entry: QuizHistoryEntrySnapshot) => void
}

const defaultPersistCompletedQuizDeps: PersistCompletedQuizDeps = {
	setAdaptiveSkills: (skills) => {
		adaptiveSkills.current = skills
	},
	setLastResults: (value) => {
		lastResults.current = value
	},
	appendQuizHistory: (entry) => {
		quizHistory.update((history) => appendQuizHistoryEntry(history, entry))
	}
}

export function persistCompletedQuiz(
	quiz: Quiz,
	puzzleSet: Puzzle[],
	preQuizSkill: AdaptiveSkillMap | undefined,
	deps: PersistCompletedQuizDeps = defaultPersistCompletedQuizDeps
): LastResults {
	// Side-effect boundary: callers can inject store writers to keep this function
	// deterministic in tests and isolate persistence concerns.
	const persistedResults: LastResults = {
		puzzleSet,
		quizStats: getQuizStats(puzzleSet),
		quiz: { ...quiz },
		preQuizSkill: preQuizSkill ?? [...quiz.adaptiveSkillByOperator]
	}

	// Replay quizzes replay memorised items, not novel practice.
	// Persisting skill gains or streaks from recalled answers would inflate
	// the adaptive profile and reward grinding over genuine learning.
	const isReplay = quiz.replayPuzzles != null && quiz.replayPuzzles.length > 0

	if (!isReplay) {
		deps.setAdaptiveSkills([...quiz.adaptiveSkillByOperator])
		const conceptStats = persistedResults.quizStats.conceptStats ?? []
		if (conceptStats.length > 0) {
			deps.appendQuizHistory({
				completedAt: Date.now(),
				conceptStats
			})
		}
	}

	deps.setLastResults(persistedResults)

	return persistedResults
}

export function buildCompletedQuizResultsUrl(quiz: Quiz): string {
	const resultParams = buildQuizParams(quiz)
	resultParams.set('animate', 'true')
	return `/results?${resultParams}`
}
