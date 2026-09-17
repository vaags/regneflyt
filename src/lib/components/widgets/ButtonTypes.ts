export type ButtonColor = 'red' | 'blue' | 'green' | 'gray'
export type ButtonVariant = 'solid' | 'outline'
export type ButtonSize = 'small' | 'medium' | 'large'

export const buttonSolidColorClass: Record<ButtonColor, string> = {
	blue: 'btn-blue',
	green: 'btn-green',
	red: 'btn-red',
	gray: 'btn-gray'
}

export const buttonSizeClass: Record<ButtonSize, string> = {
	small: 'btn-size-small',
	medium: 'btn-size-medium',
	large: 'btn-size-large'
}

export const buttonOutlineColorClass: Record<ButtonColor, string> = {
	blue: 'btn-outline-blue',
	green: 'btn-outline-green',
	red: 'btn-outline-red',
	gray: 'btn-outline-gray'
}

export const buttonOutlineBorderClass: Record<ButtonColor, string> = {
	blue: 'btn-outline-border-blue',
	green: 'btn-outline-border-green',
	red: 'btn-outline-border-red',
	gray: 'btn-outline-border-gray'
}

export const splitDividerOutlineColorClass: Record<ButtonColor, string> = {
	blue: 'split-divider-outline-blue',
	green: 'split-divider-outline-green',
	red: 'split-divider-outline-red',
	gray: 'split-divider-outline-gray'
}
