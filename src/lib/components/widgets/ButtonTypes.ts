export type ButtonColor = 'red' | 'blue' | 'green' | 'gray'
export type ButtonVariant = 'solid' | 'outline'
export type ButtonSize = 'small' | 'medium' | 'large'

/**
 * Identity helper with no runtime effect. Wrapping a class-name lookup table
 * in `tw(...)` lets Tailwind CSS IntelliSense recognize the literal class
 * names inside it via the `tailwindCSS.classFunctions` setting in
 * .vscode/settings.json — the extension walks call arguments recursively, so
 * one wrap per map is enough; individual entries don't need wrapping.
 */
function tw<T>(classMap: T): T {
	return classMap
}

export const buttonSolidColorClass: Record<ButtonColor, string> = tw({
	blue: 'btn-blue',
	green: 'btn-green',
	red: 'btn-red',
	gray: 'btn-gray'
})

export const buttonOutlineColorClass: Record<ButtonColor, string> = tw({
	blue: 'btn-outline-blue',
	green: 'btn-outline-green',
	red: 'btn-outline-red',
	gray: 'btn-outline-gray'
})

export const buttonOutlineBorderClass: Record<ButtonColor, string> = tw({
	blue: 'btn-outline-border-blue',
	green: 'btn-outline-border-green',
	red: 'btn-outline-border-red',
	gray: 'btn-outline-border-gray'
})

export const splitDividerOutlineColorClass: Record<ButtonColor, string> = tw({
	blue: 'split-divider-outline-blue',
	green: 'split-divider-outline-green',
	red: 'split-divider-outline-red',
	gray: 'split-divider-outline-gray'
})
