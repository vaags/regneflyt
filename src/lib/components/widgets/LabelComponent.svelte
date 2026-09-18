<script lang="ts">
	import type { Snippet } from 'svelte'
	let { children }: { children: Snippet } = $props()
</script>

<span class="label">
	{@render children()}
</span>

<style>
	.label {
		display: inline-block;
		min-inline-size: 0;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background: var(--color-primary-100);
		color: var(--color-primary-950);
		font-weight: 500;
		vertical-align: middle;
		overflow-wrap: anywhere;
	}

	:global(.dark) .label {
		background: var(--color-primary-950);
		color: var(--color-primary-100);
	}
</style>
