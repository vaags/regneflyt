type MaybeText = string | null | undefined

function hasNonEmptyText(value: MaybeText): boolean {
	return (value?.trim().length ?? 0) > 0
}

export function hasAccessibleFormName(input: {
	ariaLabel?: MaybeText
	ariaLabelledBy?: MaybeText
}): boolean {
	return (
		hasNonEmptyText(input.ariaLabel) || hasNonEmptyText(input.ariaLabelledBy)
	)
}

export function hasAccessibleLegendText(legendText: MaybeText): boolean {
	return hasNonEmptyText(legendText)
}

export function hasAccessibleIconButtonName(input: {
	svgAriaLabel?: MaybeText
	buttonAriaLabel?: MaybeText
	buttonText?: MaybeText
	hasSrOnlyText?: boolean
}): boolean {
	return (
		hasNonEmptyText(input.svgAriaLabel) ||
		hasNonEmptyText(input.buttonAriaLabel) ||
		hasNonEmptyText(input.buttonText) ||
		(input.hasSrOnlyText ?? false)
	)
}

export function hasVisibleActiveElement(input: {
	visible?: boolean | null | undefined
}): boolean {
	return input.visible === true
}

export function toFocusHook(input: {
	testId?: MaybeText
	id?: MaybeText
	ariaLabel?: MaybeText
	focusIndex?: number
}): string | null {
	if (hasNonEmptyText(input.testId)) return `testid:${input.testId!.trim()}`
	if (hasNonEmptyText(input.id)) return `id:${input.id!.trim()}`
	if (hasNonEmptyText(input.ariaLabel)) return `aria:${input.ariaLabel!.trim()}`
	if (typeof input.focusIndex === 'number' && input.focusIndex >= 0) {
		return `index:${input.focusIndex}`
	}
	return null
}

export function hasExpectedDialogFocusWrap(input: {
	actualHook: string | null
	expectedHook: string | null
}): boolean {
	return input.expectedHook !== null && input.actualHook === input.expectedHook
}

export function isFocusContainedInDialog(input: {
	isInsideDialog: boolean
}): boolean {
	return input.isInsideDialog
}
