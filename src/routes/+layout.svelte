<script lang="ts">
	import '../app.css'
	import { onMount } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { getLocale } from '$lib/paraglide/runtime.js'

	function updateHead() {
		document.documentElement.lang = getLocale()
		document.title = m.app_title_full()
		const desc = document.querySelector('meta[name="description"]')
		if (desc) desc.setAttribute('content', m.app_description())
	}

	onMount(() => {
		updateHead()
	})
</script>

<slot />
