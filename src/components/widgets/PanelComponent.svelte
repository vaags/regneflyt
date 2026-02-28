<script lang="ts">
	import LabelComponent from './LabelComponent.svelte'
	export let heading: string | undefined = undefined
	export let label: string | undefined = undefined
</script>

<section class="pb-2 md:pb-3">
	<div class="panel-surface rounded-md px-6 py-5 md:px-8 md:py-7">
		<div class="flex justify-between">
			{#if heading}
				<h2
					class="font-handwriting mb-5 text-3xl text-gray-900 md:mb-6 md:text-4xl dark:text-gray-300"
				>
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
