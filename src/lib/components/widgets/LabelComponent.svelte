<script lang="ts">
	import type { Snippet } from 'svelte'
	let { children }: { children: Snippet } = $props()
</script>

<span
	class="min-w-0 rounded bg-sky-100 px-2 py-1 align-middle font-medium wrap-break-word text-sky-950 dark:bg-sky-950 dark:text-sky-100"
>
	{@render children()}
</span>
