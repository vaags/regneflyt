<script lang="ts">
	import Layout from '../../../src/routes/+layout.svelte'
	import type { LayoutData } from '../../../src/routes/$types'
	import type { Quiz } from '../../../src/lib/models/Quiz'
	import MenuView from '../../../src/routes/MenuView.svelte'

	let {
		quiz,
		onGetReady = () => {},
		data = {
			pathname: '/',
			search: '',
			pageTitleKey: 'home',
			locale: 'en'
		} as LayoutData
	}: {
		quiz: Quiz
		onGetReady?: (quiz: Quiz) => void
		data?: LayoutData
	} = $props()
</script>

<Layout {data}>
	<MenuView {quiz} {onGetReady} />
</Layout>
