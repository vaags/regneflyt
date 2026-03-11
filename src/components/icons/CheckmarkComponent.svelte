<script lang="ts">
	let {
		label,
		testId = undefined
	}: { label: string; testId?: string | undefined } = $props()
</script>

<span
	class="mt-1 mb-2 ml-0.5 block h-2.5 w-4.5 -rotate-45 transform border-b-4 border-l-4 border-green-600"
	aria-label={label}
	role="img"
	data-testid={testId}
></span>
