<script lang="ts">
	import type { Snippet } from 'svelte'

	let {
		testId,
		primaryActions,
		secondaryActions = undefined
	}: {
		testId: string
		primaryActions: Snippet
		secondaryActions?: Snippet | undefined
	} = $props()
</script>

<nav class="flex flex-col gap-2 md:gap-3" data-testid={testId}>
	<div>
		{@render primaryActions()}
	</div>

	{#if secondaryActions}
		<div class="flex flex-wrap items-center justify-end gap-2 md:gap-3">
			{@render secondaryActions()}
		</div>
	{/if}
</nav>
