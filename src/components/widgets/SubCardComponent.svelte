<script lang="ts">
	export let heading: string
</script>

<div class="flex flex-col">
	<div class="rounded-tl rounded-tr bg-blue-800 px-2 py-1 text-xs text-gray-100">
		{heading}
	</div>
	<div class="rounded-bl rounded-br border border-t-0 border-gray-500 px-2 py-1 text-lg md:text-xl">
		<slot />
	</div>
</div>
