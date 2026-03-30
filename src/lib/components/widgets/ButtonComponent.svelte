<script lang="ts">
	import type { Snippet } from 'svelte'
	import {
		btnColorClass,
		type ButtonSizeAlias,
		buttonOutlineBorderClassByColor,
		buttonOutlineToneClassByColor,
		buttonPrimarySizeClassBySize,
		buttonSolidContentClass,
		type ButtonColor,
		type ButtonVariant,
		normalizeButtonSize,
		type UnifiedButtonSize
	} from '$lib/constants/StyleConstants'

	let {
		color = 'blue',
		variant = 'solid',
		size = 'medium',
		title = null,
		testId = undefined,
		disabled = false,
		fullWidth = false,
		margin = false,
		onclick,
		children
	}: {
		color?: ButtonColor
		variant?: ButtonVariant
		size?: ButtonSizeAlias
		title?: string | null
		testId?: string | undefined
		disabled?: boolean
		fullWidth?: boolean
		margin?: boolean
		onclick?: (e: MouseEvent) => void
		children: Snippet
	} = $props()

	let resolvedSize = $derived(normalizeButtonSize(size))

	let toneClass = $derived(
		variant === 'outline'
			? `${buttonOutlineToneClassByColor[color]} border ${buttonOutlineBorderClassByColor[color]}`
			: `${btnColorClass[color]} ${buttonSolidContentClass}`
	)
</script>

<button
	onclick={(e) => {
		e.preventDefault()
		onclick?.(e)
	}}
	aria-label={title}
	{title}
	{disabled}
	data-testid={testId}
	class="{buttonPrimarySizeClassBySize[
		resolvedSize
	]} inline-flex items-center justify-center rounded-md font-light outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-offset-stone-900 {fullWidth
		? 'w-full'
		: ''} {margin
		? 'mr-1'
		: ''} {toneClass} transition-all duration-200 ease-out active:scale-95 disabled:opacity-50"
>
	{@render children()}
</button>
