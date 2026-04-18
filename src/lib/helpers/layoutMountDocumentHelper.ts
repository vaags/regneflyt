type LayoutMountDocumentTarget = {
	body: { classList: { remove: (token: string) => void } }
	documentElement: {
		style: { setProperty: (property: string, value: string) => void }
	}
}

export function setupLayoutMountDocument(
	documentTarget: LayoutMountDocumentTarget,
	requestAnimationFrameFn: (callback: () => void) => unknown,
	themeTransitionMs: number,
	pageTransitionMs: number,
	initialLoadClass = 'initial-load'
): void {
	const clearInitialLoadClass = () => {
		documentTarget.body.classList.remove(initialLoadClass)
	}

	requestAnimationFrameFn(() => {
		requestAnimationFrameFn(clearInitialLoadClass)
	})

	documentTarget.documentElement.style.setProperty(
		'--theme-transition-ms',
		`${themeTransitionMs}ms`
	)
	documentTarget.documentElement.style.setProperty(
		'--page-transition-ms',
		`${pageTransitionMs}ms`
	)
}
