<script lang="ts">
	export let heading: string
</script>

<div class="flex flex-col">
	<div class="rounded-tl rounded-tr bg-blue-800 py-1 px-2 text-xs text-gray-100">
		{heading}
	</div>
	<div class="rounded-bl rounded-br border border-t-0 border-gray-500 py-1 px-2 text-lg md:text-xl">
		<slot />
	</div>
</div>
