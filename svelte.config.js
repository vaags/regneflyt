import preprocess from 'svelte-preprocess'
import vercel from '@sveltejs/adapter-vercel'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		vite: {
			define: {
				APP_VERSION: JSON.stringify(process.env.npm_package_version)
			},
			server: {
				fs: {
					allow: ['locales']
				}
			}
		},
		adapter: vercel()
	}
}

export default config
