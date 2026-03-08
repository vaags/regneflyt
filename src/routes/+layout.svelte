<script lang="ts">
	import '../app.css'
	import { onMount } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime.js'

	function updateHead() {
		document.documentElement.lang = getLocale()
		document.title = m.app_title_full()
		const desc = document.querySelector('meta[name="description"]')
		if (desc) desc.setAttribute('content', m.app_description())
	}

	onMount(() => {
		const stored = document.cookie
			.split('; ')
			.find((c) => c.startsWith('PARAGLIDE_LOCALE='))
			?.split('=')[1]

		if (!stored) {
			const browserLang = navigator.language.split('-')[0]
			const match = locales.find((l) => l === browserLang)
			if (match && match !== getLocale()) {
				setLocale(match, { reload: false })
			}
		}

		updateHead()
	})
</script>

<slot />
