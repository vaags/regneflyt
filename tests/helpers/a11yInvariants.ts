type MaybeText = string | null | undefined

type RGB = { r: number; g: number; b: number }

function sRGBtoLinear(c: number): number {
	const s = c / 255
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function relativeLuminance({ r, g, b }: RGB): number {
	return (
		0.2126 * sRGBtoLinear(r) +
		0.7152 * sRGBtoLinear(g) +
		0.0722 * sRGBtoLinear(b)
	)
}

/** WCAG 2.x contrast ratio between two RGB colours (always ≥ 1). */
export function contrastRatio(fg: RGB, bg: RGB): number {
	const l1 = relativeLuminance(fg)
	const l2 = relativeLuminance(bg)
	const lighter = Math.max(l1, l2)
	const darker = Math.min(l1, l2)
	return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Parse a CSS `rgb(r, g, b)` or `rgba(r, g, b, a)` string into an RGB tuple.
 * Returns null if the string cannot be parsed.
 */
export function parseRGB(css: string): RGB | null {
	const m =
		/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/.exec(css)
	if (!m) return null
	return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
}

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
