<script lang="ts">
	let {
		ariaLabel,
		testId = undefined,
		onclick
	}: {
		ariaLabel: string
		testId?: string | undefined
		onclick?: (e: MouseEvent) => void
	} = $props()
</script>

<button
	type="button"
	class="close-button focus-indicator"
	{onclick}
	aria-label={ariaLabel}
	data-testid={testId}
>
	✕
</button>

<style>
	.close-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: 3rem;
		min-block-size: 3rem;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--color-text-muted);
		font-size: 1.5rem;
		line-height: 1;
		transition:
			transform 200ms ease-out,
			color 200ms ease-out,
			box-shadow 200ms ease-out;
	}

	.close-button:hover {
		color: var(--color-text-primary);
	}

	.close-button:active {
		transform: translateY(1px);
		box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.06);
	}
</style>
