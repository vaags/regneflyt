<script lang="ts">
	let {
		ariaLabel,
		testId = undefined,
		onclick,
		className = ''
	}: {
		ariaLabel: string
		testId?: string | undefined
		onclick?: (e: MouseEvent) => void
		className?: string
	} = $props()
</script>

<button
	type="button"
	class="focus-ring inline-flex min-h-12 min-w-12 items-center justify-center rounded-md text-2xl leading-none text-stone-600 transition-[transform,color,box-shadow] duration-200 ease-out hover:text-stone-900 active:translate-y-px active:shadow-inner dark:text-stone-300 dark:hover:text-stone-100 {className}"
	{onclick}
	aria-label={ariaLabel}
	data-testid={testId}
>
	✕
</button>
