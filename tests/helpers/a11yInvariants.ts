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

export function hasAccessibleIconButtonName(input: {
	svgAriaLabel?: string | null | undefined
	buttonAriaLabel?: string | null | undefined
	buttonText?: string | null | undefined
	hasSrOnlyText?: boolean
}): boolean {
	return (
		(input.svgAriaLabel?.trim().length ?? 0) > 0 ||
		(input.buttonAriaLabel?.trim().length ?? 0) > 0 ||
		(input.buttonText?.trim().length ?? 0) > 0 ||
		(input.hasSrOnlyText ?? false)
	)
}
