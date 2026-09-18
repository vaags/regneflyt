<script lang="ts">
	let { label }: { label: string } = $props()
</script>

<svg viewBox="0 0 24 24" fill="currentColor" aria-label={label} role="img">
	<path
		d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
	/>
</svg>

<style>
	svg {
		display: inline-block;
		inline-size: 1.4em;
		block-size: 1.4em;
		color: var(--color-warning-500);
		vertical-align: middle;
	}
</style>
