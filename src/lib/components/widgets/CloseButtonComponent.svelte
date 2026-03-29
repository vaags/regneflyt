<script lang="ts">
	let {
		ariaLabel,
		testId = undefined,
		onclick,
		className = '',
		initialFocus = false
	}: {
		ariaLabel: string
		testId?: string | undefined
		onclick?: (e: MouseEvent) => void
		className?: string
		initialFocus?: boolean
	} = $props()
</script>

<button
	type="button"
	class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-2xl leading-none text-stone-600 hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-sky-300 dark:text-stone-400 dark:hover:text-stone-100 dark:focus-visible:ring-sky-400 {className}"
	{onclick}
	data-dialog-initial-focus={initialFocus ? 'true' : undefined}
	aria-label={ariaLabel}
	data-testid={testId}
>
	✕
</button>
