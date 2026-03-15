<script lang="ts">
	let {
		label,
		testId = undefined
	}: { label: string; testId?: string | undefined } = $props()
</script>

<svg
	class="inline-block h-[1.2em] w-[1.2em] align-middle text-red-600"
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
	<line x1="18" y1="6" x2="6" y2="18" />
	<line x1="6" y1="6" x2="18" y2="18" />
</svg>
