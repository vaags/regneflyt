const colors = require('tailwindcss/colors');

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
		extend: {}
	},
	plugins: [require('@tailwindcss/forms')]
};
