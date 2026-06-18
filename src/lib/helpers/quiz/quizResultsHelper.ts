import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
import type { Puzzle } from '$lib/models/Puzzle'
import type { Quiz } from '$lib/models/Quiz'
import { adaptiveSkills, lastResults } from '$lib/stores'
import type { LastResults } from '$lib/stores'
import { getQuizStats } from '../statsHelper'
import { buildQuizParams } from '../urlParamsHelper'

type PersistCompletedQuizDeps = {
	setAdaptiveSkills: (skills: AdaptiveSkillMap) => void
	setLastResults: (value: LastResults) => void
}

const defaultPersistCompletedQuizDeps: PersistCompletedQuizDeps = {
	setAdaptiveSkills: (skills) => {
		adaptiveSkills.current = skills
	},
	setLastResults: (value) => {
		lastResults.current = value
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

	deps.setAdaptiveSkills([...quiz.adaptiveSkillByOperator])

	deps.setLastResults(persistedResults)

	return persistedResults
}

export function buildCompletedQuizResultsUrl(quiz: Quiz): string {
	const resultParams = buildQuizParams(quiz)
	resultParams.set('animate', 'true')
	return `/results?${resultParams}`
}
