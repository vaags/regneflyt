import { dev } from '$app/env'

export const AppSettings = {
	isProduction: !dev,
	separatorPageDuration: dev ? 3 : 3,
	puzzleTimeLimitDuration: 3,
	transitionDuration: {
		duration: 200
	},
	pageTransitionDuration: {
		duration: 100
	},
	operatorLabels: ['Addisjon', 'Subtraksjon', 'Multiplikasjon', 'Divisjon', 'Alle regnearter'],
	operatorSigns: ['&#43;', '&#8722;', '&#215;', '&#247;', '&#8704']
} as const
