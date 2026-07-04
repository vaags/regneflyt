export type LayoutNavigationTransition = {
	shouldRunTransition: boolean
	includesQuizRoute: boolean
	leavingQuiz: boolean
	enteringQuiz: boolean
}

export type LayoutTransitionStartEffects = {
	suppressStickyGlobalNavTransitionName: boolean
	shouldAwaitTick: boolean
}

export type LayoutTransitionCompletionEffects = {
	restoreStickyGlobalNavTransitionName: boolean
}

type ViewTransition = {
	finished: Promise<void>
}

type LayoutTransitionDocumentTarget = {
	documentElement: HTMLElement
	startViewTransition(callback: () => Promise<void>): ViewTransition
}

type LayoutTransitionDocumentTargetLike = {
	documentElement: HTMLElement
	startViewTransition?:
		((callback: () => Promise<void>) => ViewTransition) | undefined
}

function resolveExecutableDocumentTarget(
	documentTarget: LayoutTransitionDocumentTargetLike | undefined
): LayoutTransitionDocumentTarget | undefined {
	if (!documentTarget?.startViewTransition) return undefined

	const startViewTransition = documentTarget.startViewTransition

	return {
		documentElement: documentTarget.documentElement,
		startViewTransition(callback: () => Promise<void>) {
			// Preserve the browser API receiver to avoid "Illegal invocation".
			return startViewTransition.call(documentTarget, callback)
		}
	}
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
		restoreStickyGlobalNavTransitionName:
			startEffects.suppressStickyGlobalNavTransitionName
	}
}

export type LayoutNavigationTransitionExecution = {
	documentTarget: LayoutTransitionDocumentTarget
	transition: LayoutNavigationTransition
	navigationComplete: Promise<void>
	awaitTick: () => Promise<void>
	onBeforeNavigationCompleteResolved: () => void
	onSetStickyTransitionSuppressed: (suppressed: boolean) => void
}

export type LayoutOnNavigateTransitionExecution = {
	fromPath: string
	toPath: string | undefined
	documentTarget: LayoutTransitionDocumentTargetLike | undefined
	navigationComplete: Promise<void>
	awaitTick: () => Promise<void>
	onSetStickyTransitionSuppressed: (suppressed: boolean) => void
}

export function executeLayoutOnNavigateTransition({
	fromPath,
	toPath,
	documentTarget,
	navigationComplete,
	awaitTick,
	onSetStickyTransitionSuppressed
}: LayoutOnNavigateTransitionExecution): Promise<void> | undefined {
	const executableDocumentTarget =
		resolveExecutableDocumentTarget(documentTarget)
	if (!executableDocumentTarget) return undefined

	const transition = resolveLayoutNavigationTransition(fromPath, toPath)
	if (!transition.shouldRunTransition) return undefined

	return new Promise((resolve) => {
		void executeLayoutNavigationTransition({
			documentTarget: executableDocumentTarget,
			transition,
			navigationComplete,
			awaitTick,
			onBeforeNavigationCompleteResolved: resolve,
			onSetStickyTransitionSuppressed
		})
	})
}

export async function executeLayoutNavigationTransition({
	documentTarget,
	transition,
	navigationComplete,
	awaitTick,
	onBeforeNavigationCompleteResolved,
	onSetStickyTransitionSuppressed
}: LayoutNavigationTransitionExecution): Promise<void> {
	const root = documentTarget.documentElement
	const startEffects = applyLayoutTransitionStartEffects(root, transition)
	const completionEffects = getLayoutTransitionCompletionEffects(startEffects)

	if (startEffects.suppressStickyGlobalNavTransitionName) {
		onSetStickyTransitionSuppressed(true)
	}
	if (startEffects.shouldAwaitTick) {
		await awaitTick()
	}

	const viewTransition = documentTarget.startViewTransition(async () => {
		onBeforeNavigationCompleteResolved()
		await navigationComplete
		if (completionEffects.restoreStickyGlobalNavTransitionName) {
			onSetStickyTransitionSuppressed(false)
		}
	})

	void viewTransition.finished.then(() => {
		clearLayoutTransitionClasses(root)
	})
}
