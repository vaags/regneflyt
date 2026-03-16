export const TimerState = {
	Initialized: 0,
	Started: 1,
	Resumed: 2,
	Stopped: 3,
	Finished: 4,
	Paused: 5
} as const

export type TimerState = (typeof TimerState)[keyof typeof TimerState]
