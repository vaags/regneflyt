export const AppSettings = {
	isProduction: import.meta.env.PROD,
	separatorPageDuration: import.meta.env.DEV ? 1 : 3,
	regneflytThresholdSeconds: 3,
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
	]
} as const
