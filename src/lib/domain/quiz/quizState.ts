export const QuizState = {
	AboutToStart: 0,
	Started: 1
} as const

export type QuizState = (typeof QuizState)[keyof typeof QuizState]
