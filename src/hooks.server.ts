import type { Handle } from '@sveltejs/kit'

const darkStyle = `<style>html.dark{color-scheme:dark;background:linear-gradient(135deg,#232526 0%,#414345 100%) #18181b}html.dark body{color:#e5e7eb}</style>`

// This script must stay in sync with the CSP hash in svelte.config.js
const systemScript = `<script>(function(){if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark')})()</script>`
const systemStyle = `<style>@media(prefers-color-scheme:dark){html{color-scheme:dark;background:linear-gradient(135deg,#232526 0%,#414345 100%) #18181b}html body{color:#e5e7eb}}</style>`

export const handle: Handle = async ({ event, resolve }) => {
	const themeCookie = event.cookies.get('regneflyt-theme')

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			if (themeCookie === 'dark') {
				return html
					.replace('<html lang=', '<html class="dark" lang=')
					.replace('</head>', `${darkStyle}</head>`)
			}
			if (themeCookie === 'light') {
				return html
			}
			// 'system' or no cookie: detect OS preference client-side
			return html.replace('</head>', `${systemScript}${systemStyle}</head>`)
		}
	})
}
