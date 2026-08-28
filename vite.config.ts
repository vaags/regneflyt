import adapter from '@sveltejs/adapter-vercel'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const deploymentVersion =
	process.env.VERCEL_GIT_COMMIT_SHA ??
	process.env.GITHUB_SHA ??
	process.env.npm_package_version ??
	'0.0.0'

export default defineConfig({
	// Vite tooling and SvelteKit runtime policy share this configuration in Kit 3.
	server: {
		watch: {
			ignored: [
				'**/.svelte-kit/**',
				'**/.vercel/**',
				'**/coverage/**',
				'**/playwright-report/**',
				'**/test-results/**',
				'**/blob-report/**'
			]
		}
	},
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			outputStructure: 'message-modules'
		}),

		sveltekit({
			preprocess: vitePreprocess(),
			compilerOptions: { runes: true },
			adapter: adapter(),
			version: { name: deploymentVersion },
			serviceWorker: { register: false },
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': [
						'self',
						'sha256-vHvv2DdHz3N4Uu+dqgXz43liIKx4r+1pmjAQzJB5vdU='
					],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'connect-src': ['self', 'https://vitals.vercel-insights.com'],
					'font-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	]
})
