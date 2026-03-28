<script lang="ts">
	import Layout from '../../../src/routes/+layout.svelte'
	import type { LayoutData } from '../../../src/routes/$types'

	let {
		data = { pathname: '/', pageTitleKey: 'home' } as LayoutData
	}: { data?: LayoutData } = $props()
</script>

<Layout {data}>
	<div data-testid="layout-child">child</div>
</Layout>
