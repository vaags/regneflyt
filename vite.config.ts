import { sveltekit } from '@sveltejs/kit/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'

export default defineConfig({
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
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}),
		sveltekit()
	]
})
