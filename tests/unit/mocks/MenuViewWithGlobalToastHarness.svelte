<script lang="ts">
	import type { Quiz } from '../../../src/lib/models/Quiz'
	import MenuView from '../../../src/routes/MenuView.svelte'
	import ToastComponent from '../../../src/lib/components/widgets/ToastComponent.svelte'
	import { activeToast, dismissToast } from '../../../src/lib/stores'

	let {
		quiz,
		onGetReady = () => {}
	}: {
		quiz: Quiz
		onGetReady?: (quiz: Quiz) => void
	} = $props()
</script>

<MenuView {quiz} {onGetReady} />

{#if $activeToast}
	{#key $activeToast.id}
		<ToastComponent
			testId="menu-global-toast"
			message={$activeToast.message}
			variant={$activeToast.variant}
			autoDismissMs={$activeToast.autoDismissMs}
			onDismiss={dismissToast}
		/>
	{/key}
{/if}
