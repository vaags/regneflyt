import { dev } from '$app/environment'

export const AppSettings = {
	isProduction: !dev,
	separatorPageDuration: dev ? 1 : 3,
	puzzleTimeLimitDuration: 3,
	transitionDuration: {
		duration: 200
	},
	pageTransitionDuration: {
		duration: 100
	},
	operatorLabels: [
		'Addisjon',
		'Subtraksjon',
		'Multiplikasjon',
		'Divisjon',
		'Alle regnearter'
	],
	operatorSigns: ['&#43;', '&#8722;', '&#215;', '&#247;', '&#8704']
} as const
