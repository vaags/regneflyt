<script lang="ts">
	import Layout from '../../../src/routes/+layout.svelte'
	import type { LayoutData } from '../../../src/routes/$types'
	import SettingsContextProbe from './SettingsContextProbe.svelte'

	let {
		data = {
			pathname: '/settings',
			search: '',
			canonicalUrl: 'https://example.com/settings',
			pageTitleKey: 'settings',
			locale: 'en'
		} as LayoutData
	}: { data?: LayoutData } = $props()
</script>

<Layout {data}>
	<SettingsContextProbe />
</Layout>
