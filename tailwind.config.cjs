const {
	stone,
	orange,
	red,
	emerald,
	sky,
	amber,
	black,
	white
} = require('tailwindcss/colors')

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		colors: {
			black,
			white,
			gray: stone,
			orange,
			red,
			green: emerald,
			blue: sky,
			yellow: amber
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
