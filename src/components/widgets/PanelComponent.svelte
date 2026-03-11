<script lang="ts">
	import type { Snippet } from 'svelte'
	import LabelComponent from './LabelComponent.svelte'

	let {
		heading = undefined,
		headingTestId = undefined,
		label = undefined,
		labelSnippet,
		children
	}: {
		heading?: string | undefined
		headingTestId?: string | undefined
		label?: string | undefined
		labelSnippet?: Snippet
		children: Snippet
	} = $props()
</script>

<section class="pb-2 md:pb-3">
	<div class="panel-surface rounded-md px-6 py-5 md:px-8 md:py-7">
		<div class="flex justify-between">
			{#if heading}
				<h2
					class="font-handwriting mb-5 text-3xl text-gray-900 md:mb-6 md:text-4xl dark:text-gray-300"
					data-testid={headingTestId}
				>
					{heading}
				</h2>
			{/if}
			<div>
				{#if label !== undefined}
					<LabelComponent>{label}</LabelComponent>
				{:else if labelSnippet}
					{@render labelSnippet()}
				{/if}
			</div>
		</div>
		{@render children()}
	</div>
</section>
