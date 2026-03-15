<script lang="ts">
	let {
		label,
		testId = undefined
	}: { label: string; testId?: string | undefined } = $props()
</script>

<svg
	class="inline-block h-[1.2em] w-[1.2em] align-middle text-emerald-600"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="3.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-label={label}
	role="img"
	data-testid={testId}
>
	<polyline points="20 6 9 17 4 12" />
</svg>
