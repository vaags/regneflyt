export type LayoutNavigationTransition = {
	shouldRunTransition: boolean
	includesQuizRoute: boolean
	leavingQuiz: boolean
	enteringQuiz: boolean
}

export type LayoutTransitionStartEffects = {
	suppressStickyGlobalNavTransitionName: boolean
	deferNavMode: boolean
	shouldAwaitTick: boolean
}

export type LayoutTransitionCompletionEffects = {
	resetDeferringNavMode: boolean
	restoreStickyGlobalNavTransitionName: boolean
}

export type LayoutTransitionFinishedEffects = {
	resetNavModeToDefault: boolean
	resetDeferringNavMode: boolean
}

type ViewTransition = {
	finished: Promise<void>
}

type LayoutTransitionDocumentTarget = {
	documentElement: HTMLElement
	startViewTransition(callback: () => Promise<void>): ViewTransition
}

export function resolveLayoutNavigationTransition(
	fromPath: string,
	toPath: string | undefined
): LayoutNavigationTransition {
	if (toPath === undefined || fromPath === toPath) {
		return {
			shouldRunTransition: false,
			includesQuizRoute: false,
			leavingQuiz: false,
			enteringQuiz: false
		}
	}

	const includesQuizRoute = fromPath === '/quiz' || toPath === '/quiz'
	const leavingQuiz = fromPath === '/quiz' && toPath !== '/quiz'
	const enteringQuiz = toPath === '/quiz' && fromPath !== '/quiz'

	return {
		shouldRunTransition: true,
		includesQuizRoute,
		leavingQuiz,
		enteringQuiz
	}
}

export function applyLayoutTransitionStartEffects(
	root: HTMLElement,
	transition: LayoutNavigationTransition
): LayoutTransitionStartEffects {
	if (!transition.includesQuizRoute) {
		return {
			suppressStickyGlobalNavTransitionName: false,
			deferNavMode: false,
			shouldAwaitTick: false
		}
	}

	if (transition.enteringQuiz) {
		root.style.removeProperty('--measured-global-nav-height')
		root.classList.add('quiz-entering')
	}

	if (transition.leavingQuiz) {
		root.classList.add('quiz-leaving')
	}

	return {
		suppressStickyGlobalNavTransitionName: true,
		deferNavMode: transition.leavingQuiz,
		shouldAwaitTick: true
	}
}

export function clearLayoutTransitionClasses(root: HTMLElement): void {
	root.classList.remove('quiz-entering', 'quiz-leaving')
}

export function getLayoutTransitionCompletionEffects(
	startEffects: LayoutTransitionStartEffects
): LayoutTransitionCompletionEffects {
	return {
		resetDeferringNavMode: startEffects.deferNavMode,
		restoreStickyGlobalNavTransitionName:
			startEffects.suppressStickyGlobalNavTransitionName
	}
}

export function getLayoutTransitionFinishedEffects(
	startEffects: LayoutTransitionStartEffects
): LayoutTransitionFinishedEffects {
	return {
		resetNavModeToDefault: startEffects.deferNavMode,
		resetDeferringNavMode: startEffects.deferNavMode
	}
}

export type LayoutNavigationTransitionExecution = {
	documentTarget: LayoutTransitionDocumentTarget
	transition: LayoutNavigationTransition
	navigationComplete: Promise<void>
	awaitTick: () => Promise<void>
	onBeforeNavigationCompleteResolved: () => void
	onSetStickyTransitionSuppressed: (suppressed: boolean) => void
	onSetDeferringNavMode: (defer: boolean) => void
	onResetNavModeToDefault: () => void
}

export async function executeLayoutNavigationTransition({
	documentTarget,
	transition,
	navigationComplete,
	awaitTick,
	onBeforeNavigationCompleteResolved,
	onSetStickyTransitionSuppressed,
	onSetDeferringNavMode,
	onResetNavModeToDefault
}: LayoutNavigationTransitionExecution): Promise<void> {
	const root = documentTarget.documentElement
	const startEffects = applyLayoutTransitionStartEffects(root, transition)
	const completionEffects = getLayoutTransitionCompletionEffects(startEffects)
	const finishedEffects = getLayoutTransitionFinishedEffects(startEffects)

	if (startEffects.suppressStickyGlobalNavTransitionName) {
		onSetStickyTransitionSuppressed(true)
	}
	if (startEffects.deferNavMode) {
		onSetDeferringNavMode(true)
	}
	if (startEffects.shouldAwaitTick) {
		await awaitTick()
	}

	const viewTransition = documentTarget.startViewTransition(async () => {
		onBeforeNavigationCompleteResolved()
		await navigationComplete
		if (completionEffects.resetDeferringNavMode) {
			onSetDeferringNavMode(false)
		}
		if (completionEffects.restoreStickyGlobalNavTransitionName) {
			onSetStickyTransitionSuppressed(false)
		}
	})

	viewTransition.finished.then(() => {
		clearLayoutTransitionClasses(root)
		if (finishedEffects.resetNavModeToDefault) {
			onResetNavModeToDefault()
		}
		if (finishedEffects.resetDeferringNavMode) {
			onSetDeferringNavMode(false)
		}
	})
}
