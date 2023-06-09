import * as colors from 'tailwindcss/colors'

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		colors: {
			black: '#000',
			white: '#fff',
			gray: colors.stone,
			orange: colors.orange,
			red: colors.red,
			green: colors.emerald,
			blue: colors.sky,
			yellow: colors.amber
		},
		extend: {
			rotate: {
				25.5: '25.5deg',
				35: '35deg',
				'-35': '-35deg'
			},
			spacing: {
				4.5: '1.125rem'
			}
		}
	},
	plugins: [require('@tailwindcss/forms')]
}
