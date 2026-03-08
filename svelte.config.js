import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-vercel'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: true
	},

	kit: {
		adapter: adapter(),
		version: {
			name: process.env.npm_package_version
		}
	}
}

export default config
