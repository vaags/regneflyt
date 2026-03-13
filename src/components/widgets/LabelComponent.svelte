<script lang="ts">
	import type { Snippet } from 'svelte'
	let { children }: { children: Snippet } = $props()
</script>

<span
	class="rounded bg-blue-100 px-2 py-1 align-middle font-medium text-blue-950 dark:bg-blue-950 dark:text-blue-100"
>
	{@render children()}
</span>
