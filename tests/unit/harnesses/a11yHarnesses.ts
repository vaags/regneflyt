import { render } from '@testing-library/svelte'
import PuzzleView from './PuzzleViewDockHarness.svelte'
import type { Puzzle } from '$lib/models/Puzzle'
import { QuizState } from '$lib/constants/QuizState'
import { createTestQuiz } from '../component-setup'
import DialogPrimitiveHarness from './DialogPrimitiveHarness.svelte'
import NumpadPrimitiveHarness from './NumpadPrimitiveHarness.svelte'

export function renderDialogPrimitiveHarness(): ReturnType<typeof render> {
	return render(DialogPrimitiveHarness)
}

export function renderNumpadPrimitiveHarness(
	props: {
		disabled?: boolean
		disabledNext?: boolean
		onCompletePuzzle?: () => void
	} = {}
): ReturnType<typeof render> {
	return render(NumpadPrimitiveHarness, { props })
}

export function renderPuzzlePrimitiveHarness(props?: {
	onAddPuzzle?: (puzzle: Puzzle) => void
}): ReturnType<typeof render> {
	return render(PuzzleView, {
		props: {
			quiz: createTestQuiz({ state: QuizState.Started }),
			seconds: 0,
			...props
		}
	})
}
