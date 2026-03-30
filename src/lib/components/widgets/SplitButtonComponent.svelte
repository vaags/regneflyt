<script lang="ts">
	import type { Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		btnColorClass,
		type ButtonSizeAlias,
		buttonOutlineBorderClassByColor,
		buttonOutlineToneClassByColor,
		buttonPrimarySizeClassBySize,
		normalizeButtonSize,
		splitChevronSizeClassBySize,
		splitOutlineDividerClassByColor,
		splitToggleSizeClassBySize,
		splitWrapperSizeClassBySize,
		type ButtonColor,
		type ButtonVariant
	} from '$lib/constants/StyleConstants'
	import ChevronDownComponent from '../icons/ChevronDownComponent.svelte'

	let {
		color = 'green',
		variant = 'solid',
		size = 'medium',
		testId = undefined,
		fullWidth = false,
		secondaryEnabled = true,
		onclick,
		onSecondaryClick,
		secondaryLabel,
		children
	}: {
		color?: ButtonColor
		variant?: ButtonVariant
		size?: ButtonSizeAlias
		testId?: string | undefined
		fullWidth?: boolean
		secondaryEnabled?: boolean
		onclick: (e: MouseEvent) => void
		onSecondaryClick?: (e: MouseEvent) => void
		secondaryLabel: string
		children: Snippet
	} = $props()

	let resolvedSize = $derived(normalizeButtonSize(size))

	let open = $state(false)
	let dropUp = $state(false)

	let wrapper = $state<HTMLDivElement>(undefined!)
	let toggleBtn = $state<HTMLButtonElement>(undefined!)
	let menuItemBtn = $state<HTMLButtonElement>(undefined!)

	function shouldDropUp(): boolean {
		if (wrapper?.closest('[data-sticky-global-nav]')) return true

		const rect = wrapper.getBoundingClientRect()
		const estimatedMenuHeight = menuItemBtn?.offsetHeight ?? 48
		const verticalGap = 8
		return rect.bottom + estimatedMenuHeight + verticalGap > window.innerHeight
	}

	function toggle() {
		if (!secondaryEnabled) return
		if (!open) {
			dropUp = shouldDropUp()
		}
		open = !open
		if (open) {
			// Move focus into the menu item after DOM update
			queueMicrotask(() => menuItemBtn?.focus())
		}
	}

	function closeMenu(restoreFocus = true) {
		open = false
		if (restoreFocus) toggleBtn?.focus()
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as Node
		if (!wrapper?.contains(target)) {
			closeMenu(false)
		}
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault()
			closeMenu()
		} else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault()
			menuItemBtn?.focus()
		} else if (e.key === 'Tab' || e.key === 'Home' || e.key === 'End') {
			closeMenu(false)
		}
	}

	function handleToggleKeydown(e: KeyboardEvent) {
		if (!secondaryEnabled) return
		if (e.key === 'Escape' && open) {
			e.preventDefault()
			closeMenu()
		} else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
			e.preventDefault()
			toggle()
		}
	}

	const baseClasses =
		'font-light outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-offset-stone-900 transition-all duration-200 ease-out'
	const transitionDuration = AppSettings.transitionDuration.duration

	$effect(() => {
		if (!secondaryEnabled && open) {
			closeMenu(false)
		}
	})
</script>

<svelte:document onclick={handleClickOutside} />

<div
	class="relative {fullWidth ? 'w-full' : 'inline-flex'}"
	bind:this={wrapper}
>
	<div
		class="{fullWidth
			? 'flex w-full'
			: 'inline-flex'} overflow-hidden rounded-md transition-transform duration-200 ease-out active:scale-95 {variant ===
		'outline'
			? `border ${buttonOutlineBorderClassByColor[color]}`
			: ''} {splitWrapperSizeClassBySize[resolvedSize]}"
	>
		<button
			type="button"
			onclick={(e) => {
				e.preventDefault()
				onclick(e)
			}}
			class="inline-flex items-center justify-center {secondaryEnabled
				? 'rounded-l-md'
				: 'rounded-md'} {fullWidth
				? 'flex-1'
				: ''} {buttonPrimarySizeClassBySize[
				resolvedSize
			]} h-full min-h-0 {variant === 'outline'
				? buttonOutlineToneClassByColor[color]
				: btnColorClass[color]} {baseClasses}"
			data-testid={testId}
		>
			{@render children()}
		</button>
		<div
			class="flex items-stretch overflow-hidden transition-[max-width,opacity] duration-200 ease-out {secondaryEnabled
				? 'max-w-20 opacity-100'
				: 'pointer-events-none max-w-0 opacity-0'}"
			aria-hidden={!secondaryEnabled}
		>
			<div
				class="flex items-center {variant === 'outline'
					? 'bg-transparent'
					: btnColorClass[color]}"
				aria-hidden="true"
			>
				<span
					class="block h-3/4 w-px {variant === 'outline'
						? splitOutlineDividerClassByColor[color]
						: 'bg-white/40'}"
				></span>
			</div>
			<button
				type="button"
				bind:this={toggleBtn}
				onclick={(e) => {
					e.preventDefault()
					e.stopPropagation()
					toggle()
				}}
				onkeydown={handleToggleKeydown}
				disabled={!secondaryEnabled}
				tabindex={secondaryEnabled ? 0 : -1}
				aria-haspopup={secondaryEnabled ? 'true' : undefined}
				aria-expanded={secondaryEnabled ? open : undefined}
				aria-label={secondaryEnabled ? secondaryLabel : undefined}
				class="flex items-center justify-center rounded-r-md {splitToggleSizeClassBySize[
					resolvedSize
				]} h-full min-h-0 {variant === 'outline'
					? buttonOutlineToneClassByColor[color]
					: btnColorClass[color]} {baseClasses}"
				data-testid={secondaryEnabled && testId
					? `${testId}-toggle`
					: undefined}
			>
				<ChevronDownComponent
					className="{splitChevronSizeClassBySize[
						resolvedSize
					]} transition-transform duration-150 {open ? 'rotate-180' : ''}"
				/>
			</button>
		</div>
	</div>

	{#if open}
		<div
			class="absolute left-0 z-50 min-w-full overflow-hidden rounded-md border border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800 {dropUp
				? 'bottom-full mb-1'
				: 'top-full mt-1'}"
			role="menu"
			tabindex="-1"
			in:fly={{
				y: dropUp ? 6 : -6,
				duration: transitionDuration,
				opacity: 0.15
			}}
			out:fly={{
				y: dropUp ? 6 : -6,
				duration: transitionDuration,
				opacity: 0.15
			}}
			onkeydown={handleMenuKeydown}
		>
			<button
				type="button"
				role="menuitem"
				bind:this={menuItemBtn}
				tabindex="-1"
				class="w-full px-4 py-2 text-left text-lg whitespace-nowrap text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700"
				data-testid={testId ? `${testId}-secondary` : undefined}
				onclick={(e) => {
					e.preventDefault()
					closeMenu()
					onSecondaryClick?.(e)
				}}
			>
				{secondaryLabel}
			</button>
		</div>
	{/if}
</div>
