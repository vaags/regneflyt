export const PuzzleMode = {
	Normal: 0,
	Alternate: 1,
	Random: 2
} as const

export type PuzzleMode = (typeof PuzzleMode)[keyof typeof PuzzleMode]

const puzzleModeRegistry = {
	0: true,
	1: true,
	2: true
} satisfies Record<PuzzleMode, true>

export function isPuzzleMode(value: number): value is PuzzleMode {
	return Object.hasOwn(puzzleModeRegistry, value)
}
