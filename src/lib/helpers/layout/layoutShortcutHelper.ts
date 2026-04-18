type ShortcutEvent = Pick<
	KeyboardEvent,
	| 'defaultPrevented'
	| 'repeat'
	| 'metaKey'
	| 'ctrlKey'
	| 'shiftKey'
	| 'key'
	| 'preventDefault'
>

export function isDevToolsShortcut(event: ShortcutEvent): boolean {
	return (
		(event.metaKey || event.ctrlKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === 'd'
	)
}

export function isOnboardingShortcut(event: ShortcutEvent): boolean {
	return (
		(event.metaKey || event.ctrlKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === 'o'
	)
}

export function handleDevToolsShortcut(
	event: ShortcutEvent,
	isProduction: boolean,
	toggle: () => void
): boolean {
	if (isProduction || event.defaultPrevented || event.repeat) return false
	if (!isDevToolsShortcut(event)) return false

	event.preventDefault()
	toggle()
	return true
}

export function handleOnboardingShortcut(
	event: ShortcutEvent,
	isProduction: boolean,
	show: () => void
): boolean {
	if (isProduction || event.defaultPrevented || event.repeat) return false
	if (!isOnboardingShortcut(event)) return false

	event.preventDefault()
	show()
	return true
}
