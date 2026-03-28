<script lang="ts">
	import type { Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { btnColorClass } from '$lib/constants/StyleConstants'

	let {
		color = 'green',
		size = 'normal',
		testId = undefined,
		onclick,
		onSecondaryClick,
		secondaryLabel,
		children
	}: {
		color?: 'red' | 'blue' | 'yellow' | 'green' | 'gray'
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

	const baseClasses =
		'font-light text-stone-100 outline-none hover:text-white focus:text-white focus:ring-4 focus:ring-inset focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-offset-stone-900 transition-all duration-200 ease-out'
	const transitionDuration = AppSettings.transitionDuration.duration
</script>

<svelte:document onclick={handleClickOutside} />

<div
	class="relative inline-flex transition-transform duration-200 ease-out active:scale-95"
	bind:this={wrapper}
>
	<button
		type="button"
		onclick={(e) => {
			e.preventDefault()
			onclick(e)
		}}
		class="rounded-l-md {size === 'small'
			? 'min-h-11 px-3 py-2 text-lg'
			: 'px-5 pt-1.5 pb-2 text-3xl'} {btnColorClass[color]} {baseClasses}"
		data-testid={testId}
	>
		{@render children()}
	</button>
	<div class="flex items-center {btnColorClass[color]}" aria-hidden="true">
		<span class="block h-3/4 w-px bg-white/40"></span>
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
			: 'px-3 py-2'} {btnColorClass[color]} {baseClasses}"
		data-testid={testId ? `${testId}-toggle` : undefined}
	>
		<svg
			class="{size === 'small'
				? 'h-6 w-6'
				: 'h-8 w-8'} transition-transform duration-150 {open
				? 'rotate-180'
				: ''}"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
				clip-rule="evenodd"
			/>
		</svg>
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
