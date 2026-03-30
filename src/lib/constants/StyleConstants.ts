export type ButtonColor = 'red' | 'blue' | 'green' | 'gray'
export type ButtonVariant = 'solid' | 'outline'

export const btnColorClass: Record<ButtonColor, string> = {
	blue: 'btn-blue',
	green: 'btn-green',
	red: 'btn-red',
	gray: 'btn-gray'
}

export const buttonOutlineToneClassByColor: Record<ButtonColor, string> = {
	blue: 'bg-transparent text-sky-800 shadow-none hover:bg-sky-100 active:bg-sky-200 focus-visible:ring-sky-300 dark:text-sky-200 dark:hover:bg-sky-900/40 dark:active:bg-sky-900/60',
	green:
		'bg-transparent text-emerald-800 shadow-none hover:bg-emerald-100 active:bg-emerald-200 focus-visible:ring-emerald-300 dark:text-emerald-200 dark:hover:bg-emerald-900/40 dark:active:bg-emerald-900/60',
	red: 'bg-transparent text-red-800 shadow-none hover:bg-red-100 active:bg-red-200 focus-visible:ring-red-300 dark:text-red-200 dark:hover:bg-red-900/40 dark:active:bg-red-900/60',
	gray: 'bg-transparent text-stone-800 shadow-none hover:bg-stone-200 active:bg-stone-300 focus-visible:ring-stone-300 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700'
}

export const buttonOutlineBorderClassByColor: Record<ButtonColor, string> = {
	blue: 'border-sky-700 dark:border-sky-400',
	green: 'border-emerald-700 dark:border-emerald-400',
	red: 'border-red-700 dark:border-red-400',
	gray: 'border-stone-600 dark:border-stone-400'
}

export const splitOutlineDividerClassByColor: Record<ButtonColor, string> = {
	blue: 'bg-sky-700/50 dark:bg-sky-300/50',
	green: 'bg-emerald-700/50 dark:bg-emerald-300/50',
	red: 'bg-red-700/50 dark:bg-red-300/50',
	gray: 'bg-stone-600/50 dark:bg-stone-300/50'
}

export const buttonSolidContentClass =
	'text-stone-100 hover:text-white focus:text-white'

export type UnifiedButtonSize = 'small' | 'medium' | 'large'
export type ButtonSizeAlias = UnifiedButtonSize | 'default' | 'normal'

export function normalizeButtonSize(size: ButtonSizeAlias): UnifiedButtonSize {
	if (size === 'default' || size === 'normal') return 'medium'
	return size
}

export const buttonPrimarySizeClassBySize: Record<UnifiedButtonSize, string> = {
	small: 'h-11 min-h-11 min-w-11 px-4 text-xl leading-none',
	medium: 'h-12 min-h-12 min-w-12 px-5 text-2xl leading-none',
	large: 'h-14 min-h-14 min-w-14 px-6 text-3xl leading-none'
}

export const splitToggleSizeClassBySize: Record<UnifiedButtonSize, string> = {
	small: 'h-11 min-h-11 min-w-11 px-3',
	medium: 'h-12 min-h-12 min-w-12 px-3',
	large: 'h-14 min-h-14 min-w-14 px-4'
}

export const splitChevronSizeClassBySize: Record<UnifiedButtonSize, string> = {
	small: 'h-6 w-6',
	medium: 'h-8 w-8',
	large: 'h-9 w-9'
}

export const splitWrapperSizeClassBySize: Record<UnifiedButtonSize, string> = {
	small: 'h-11 min-h-11',
	medium: 'h-12 min-h-12',
	large: 'h-14 min-h-14'
}
