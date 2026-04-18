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
