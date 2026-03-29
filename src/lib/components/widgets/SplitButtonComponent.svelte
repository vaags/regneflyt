<script lang="ts">
	import type { Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { btnColorClass } from '$lib/constants/StyleConstants'
	import ChevronDownComponent from '../icons/ChevronDownComponent.svelte'

	let {
		color = 'green',
		variant = 'solid',
		size = 'normal',
		testId = undefined,
		onclick,
		onSecondaryClick,
		secondaryLabel,
		children
	}: {
		color?: 'red' | 'blue' | 'yellow' | 'green' | 'gray'
		variant?: 'solid' | 'outline'
		size?: 'normal' | 'small'
		testId?: string | undefined
		onclick: (e: MouseEvent) => void
		onSecondaryClick: (e: MouseEvent) => void
		secondaryLabel: string
		children: Snippet
	} = $props()

	let open = $state(false)
	let dropUp = $state(false)

	let wrapper = $state<HTMLDivElement>(undefined!)
	let toggleBtn = $state<HTMLButtonElement>(undefined!)
	let menuItemBtn = $state<HTMLButtonElement>(undefined!)

	function toggle() {
		if (!open) {
			const rect = wrapper.getBoundingClientRect()
			dropUp = rect.bottom + 48 > window.innerHeight
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
		if (e.key === 'Escape' && open) {
			e.preventDefault()
			closeMenu()
		} else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
			e.preventDefault()
			toggle()
		}
	}

	const outlineButtonClass: Record<string, string> = {
		blue: 'bg-transparent text-sky-800 shadow-none hover:bg-sky-100 active:bg-sky-200 focus-visible:ring-sky-300 dark:text-sky-200 dark:hover:bg-sky-900/40 dark:active:bg-sky-900/60',
		green:
			'bg-transparent text-emerald-800 shadow-none hover:bg-emerald-100 active:bg-emerald-200 focus-visible:ring-emerald-300 dark:text-emerald-200 dark:hover:bg-emerald-900/40 dark:active:bg-emerald-900/60',
		red: 'bg-transparent text-red-800 shadow-none hover:bg-red-100 active:bg-red-200 focus-visible:ring-red-300 dark:text-red-200 dark:hover:bg-red-900/40 dark:active:bg-red-900/60',
		yellow:
			'bg-transparent text-amber-900 shadow-none hover:bg-amber-100 active:bg-amber-200 focus-visible:ring-amber-300 dark:text-amber-200 dark:hover:bg-amber-900/40 dark:active:bg-amber-900/60',
		gray: 'bg-transparent text-stone-800 shadow-none hover:bg-stone-200 active:bg-stone-300 focus-visible:ring-stone-300 dark:text-stone-200 dark:hover:bg-stone-800 dark:active:bg-stone-700'
	}

	const outlineSurfaceClass: Record<string, string> = {
		blue: 'rounded-md border border-sky-700 dark:border-sky-400',
		green: 'rounded-md border border-emerald-700 dark:border-emerald-400',
		red: 'rounded-md border border-red-700 dark:border-red-400',
		yellow: 'rounded-md border border-amber-700 dark:border-amber-500',
		gray: 'rounded-md border border-stone-600 dark:border-stone-400'
	}

	const outlineDividerClass: Record<string, string> = {
		blue: 'bg-sky-700/50 dark:bg-sky-300/50',
		green: 'bg-emerald-700/50 dark:bg-emerald-300/50',
		red: 'bg-red-700/50 dark:bg-red-300/50',
		yellow: 'bg-amber-700/50 dark:bg-amber-300/50',
		gray: 'bg-stone-600/50 dark:bg-stone-300/50'
	}

	const baseClasses =
		'font-light outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-offset-stone-900 transition-all duration-200 ease-out'
	const transitionDuration = AppSettings.transitionDuration.duration
</script>

<svelte:document onclick={handleClickOutside} />

<div
	class="relative inline-flex transition-transform duration-200 ease-out active:scale-95 {variant ===
	'outline'
		? outlineSurfaceClass[color]
		: ''}"
	bind:this={wrapper}
>
	<button
		type="button"
		onclick={(e) => {
			e.preventDefault()
			onclick(e)
		}}
		class="rounded-l-md {size === 'small'
			? 'min-h-11 min-w-11 px-3 py-2 text-lg'
			: 'px-5 pt-1.5 pb-2 text-3xl'} {variant === 'outline'
			? outlineButtonClass[color]
			: btnColorClass[color]} {baseClasses}"
		data-testid={testId}
	>
		{@render children()}
	</button>
	<div
		class="flex items-center {variant === 'outline'
			? 'bg-transparent'
			: btnColorClass[color]}"
		aria-hidden="true"
	>
		<span
			class="block h-3/4 w-px {variant === 'outline'
				? outlineDividerClass[color]
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
		aria-haspopup="true"
		aria-expanded={open}
		aria-label={secondaryLabel}
		class="flex items-center justify-center rounded-r-md {size === 'small'
			? 'min-h-11 min-w-11 px-2 py-2'
			: 'px-3 py-2'} {variant === 'outline'
			? outlineButtonClass[color]
			: btnColorClass[color]} {baseClasses}"
		data-testid={testId ? `${testId}-toggle` : undefined}
	>
		<ChevronDownComponent
			className="{size === 'small'
				? 'h-6 w-6'
				: 'h-8 w-8'} transition-transform duration-150 {open
				? 'rotate-180'
				: ''}"
		/>
	</button>

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
					onSecondaryClick(e)
				}}
			>
				{secondaryLabel}
			</button>
		</div>
	{/if}
</div>
