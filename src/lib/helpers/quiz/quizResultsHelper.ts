import type { OperatorSkillMap } from '#lib/domain/skill-progression/skillModel.ts'
import type { Puzzle } from '#lib/domain/puzzle-generation/puzzle.ts'
import type { Quiz } from '#lib/domain/quiz/quiz.ts'
import { operatorSkills, lastResults } from '#lib/stores.ts'
import type { LastResults } from '#lib/stores.ts'
import { getQuizStats } from '../statsHelper'
import { buildQuizParams } from '../urlParamsHelper'

type PersistCompletedQuizDeps = {
	setOperatorSkills: (skills: OperatorSkillMap) => void
	setLastResults: (value: LastResults) => void
}

const defaultPersistCompletedQuizDeps: PersistCompletedQuizDeps = {
	setOperatorSkills: (skills) => {
		operatorSkills.current = skills
	},
	setLastResults: (value) => {
		lastResults.current = value
	}
}

export function persistCompletedQuiz(
	quiz: Quiz,
	puzzleSet: Puzzle[],
	preQuizSkill: OperatorSkillMap | undefined,
	deps: PersistCompletedQuizDeps = defaultPersistCompletedQuizDeps
): LastResults {
	// Side-effect boundary: callers can inject store writers to keep this function
	// deterministic in tests and isolate persistence concerns.
	const persistedResults: LastResults = {
		puzzleSet,
		quizStats: getQuizStats(puzzleSet),
		quiz: { ...quiz },
		preQuizSkill: preQuizSkill ?? [...quiz.skillByOperator]
	}

	deps.setOperatorSkills([...quiz.skillByOperator])

	deps.setLastResults(persistedResults)

	return persistedResults
}

export function buildCompletedQuizResultsUrl(quiz: Quiz): string {
	const resultParams = buildQuizParams(quiz)
	resultParams.set('animate', 'true')
	return `/results?${resultParams}`
}
