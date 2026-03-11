export const QuizState = {
	Initial: 0,
	AboutToStart: 1,
	Started: 2,
	Completed: 3
} as const

export type QuizState = (typeof QuizState)[keyof typeof QuizState]
