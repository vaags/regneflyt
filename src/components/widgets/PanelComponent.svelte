<script lang="ts">
	import LabelComponent from './LabelComponent.svelte'
	export let heading: string | undefined = undefined
	export let label: string | undefined = undefined
</script>

<section class="pb-1 md:pb-2">
	<div
		class="
		rounded-tl-lg rounded-br-lg
		border-b-2 border-r border-l-4 border-gray-600
		bg-gray-100 px-4 py-3 md:px-6 md:py-5"
	>
		<div class="flex justify-between">
			{#if heading}
				<h2 class="font-handwriting mb-5 text-2xl text-gray-700 md:mb-6 md:text-3xl">
					{heading}
				</h2>
			{/if}
			<div>
				{#if label !== undefined}
					<LabelComponent>{label}</LabelComponent>
				{:else}
					<slot name="label" />
				{/if}
			</div>
		</div>
		<slot />
	</div>
</section>
