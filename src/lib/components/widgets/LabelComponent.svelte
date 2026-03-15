<script lang="ts">
	import type { Snippet } from 'svelte'
	let { children }: { children: Snippet } = $props()
</script>

<span
	class="rounded bg-sky-100 px-2 py-1 align-middle font-medium text-sky-950 dark:bg-sky-950 dark:text-sky-100"
>
	{@render children()}
</span>
