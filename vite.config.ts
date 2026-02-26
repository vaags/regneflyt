import { sveltekit } from '@sveltejs/kit/vite'
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
	plugins: [sveltekit()]
})
