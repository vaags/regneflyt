<script lang="ts">
	import { tick, type Snippet } from 'svelte'
	import { fly } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		type ButtonSize,
		type ButtonColor,
		type ButtonVariant,
		buttonSolidColorClass,
		buttonOutlineColorClass,
		buttonOutlineBorderClass,
		buttonSizeClass,
		splitDividerOutlineColorClass
	} from './ButtonTypes'
	import ChevronDownComponent from '../icons/ChevronDownComponent.svelte'

	// Svelte 5 runes props
	let {
		color = 'blue',
		variant = 'solid',
		size = 'medium',
		testId = undefined,
		fullWidth = false,
		secondaryEnabled = true,
		onclick,
		onSecondaryClick = undefined,
		secondaryLabel,
		children
	}: {
		color?: ButtonColor
		variant?: ButtonVariant
		size?: ButtonSize
		testId?: string | undefined
		fullWidth?: boolean
		secondaryEnabled?: boolean
		onclick: (e: MouseEvent) => void
		onSecondaryClick?: (e: MouseEvent) => void
		secondaryLabel: string
		children: Snippet
	} = $props()

	const solidColorClass = $derived(
		variant === 'solid' ? buttonSolidColorClass[color] : ''
	)
	const outlineColorClass = $derived(
		variant === 'outline' ? buttonOutlineColorClass[color] : ''
	)
	const outlineBorderClass = $derived(
		variant === 'outline' ? buttonOutlineBorderClass[color] : ''
	)
	const dividerOutlineColorClass = $derived(
		variant === 'outline' ? splitDividerOutlineColorClass[color] : ''
	)

	let open = $state(false)
	let dropUp = $state(false)

	let wrapper = $state<HTMLDivElement | undefined>(undefined)
	let toggleBtn = $state<HTMLButtonElement | undefined>(undefined)
	let menuPanel = $state<HTMLDivElement | undefined>(undefined)
	let menuItemBtn = $state<HTMLButtonElement | undefined>(undefined)
	let alignMenuEnd = $state(false)

	function shouldDropUp(): boolean {
		if (!wrapper) return false
		if (wrapper.closest('[data-sticky-global-nav]')) {
			return true
		}

		const rect = wrapper.getBoundingClientRect()
		const estimatedMenuHeight = menuItemBtn?.offsetHeight ?? 48
		const verticalGap = 8
		return rect.bottom + estimatedMenuHeight + verticalGap > window.innerHeight
	}

	function updateMenuLayout() {
		if (!wrapper || !menuPanel) return

		const viewportGutter = 8
		const rect = wrapper.getBoundingClientRect()
		const preferredWidth = Math.max(menuPanel.scrollWidth, rect.width)
		const spaceOnRight = window.innerWidth - rect.left - viewportGutter
		const spaceOnLeft = rect.right - viewportGutter

		alignMenuEnd = preferredWidth > spaceOnRight && spaceOnLeft > spaceOnRight
	}

	async function toggle() {
		if (!open) {
			dropUp = shouldDropUp()
		}
		open = !open
		if (open) {
			await tick()
			updateMenuLayout()
			menuItemBtn?.focus()
		}
	}

	function closeMenu(restoreFocus = true) {
		open = false
		if (restoreFocus) toggleBtn?.focus()
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target
		if (!(target instanceof Node)) return
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
			void toggle()
		}
	}

	const transitionDuration = AppSettings.transitionDuration.duration

	$effect(() => {
		if (!secondaryEnabled && open) {
			closeMenu(false)
		}
	})
</script>

<svelte:document onclick={handleClickOutside} />
<svelte:window onresize={() => open && updateMenuLayout()} />

<div
	class="relative {fullWidth ? 'w-full' : 'inline-flex'}"
	bind:this={wrapper}
>
	<div
		class="{fullWidth
			? 'flex w-full'
			: 'inline-flex'} overflow-hidden rounded-md transition-transform duration-200 ease-out active:scale-97 {outlineBorderClass}"
		class:split-wrapper-size-small={size === 'small'}
		class:split-wrapper-size-medium={size === 'medium'}
		class:split-wrapper-size-large={size === 'large'}
		class:border={variant === 'outline'}
	>
		<button
			type="button"
			onclick={(e) => {
				e.preventDefault()
				onclick(e)
			}}
			class="inline-flex items-center justify-center {secondaryEnabled
				? 'rounded-l-md'
				: 'rounded-md'} btn-interactive-base h-full min-h-0 {solidColorClass} {outlineColorClass} {buttonSizeClass[
				size
			]}"
			class:flex-1={fullWidth}
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
				class="flex items-center {solidColorClass}"
				class:bg-transparent={variant === 'outline'}
				aria-hidden="true"
			>
				<span
					class="block h-3/4 w-px {dividerOutlineColorClass}"
					class:split-divider-solid={variant === 'solid'}
				></span>
			</div>
			<button
				type="button"
				bind:this={toggleBtn}
				onclick={(e) => {
					e.preventDefault()
					e.stopPropagation()
					void toggle()
				}}
				onkeydown={handleToggleKeydown}
				disabled={!secondaryEnabled}
				tabindex={secondaryEnabled ? 0 : -1}
				aria-haspopup={secondaryEnabled ? 'true' : undefined}
				aria-expanded={secondaryEnabled ? open : undefined}
				aria-label={secondaryEnabled ? secondaryLabel : undefined}
				class="btn-interactive-base flex h-full min-h-0 items-center justify-center rounded-r-md {solidColorClass} {outlineColorClass}"
				class:split-toggle-size-small={size === 'small'}
				class:split-toggle-size-medium={size === 'medium'}
				class:split-toggle-size-large={size === 'large'}
				data-testid={secondaryEnabled && testId
					? `${testId}-toggle`
					: undefined}
			>
				<ChevronDownComponent
					className="{size === 'small'
						? 'split-chevron-size-small'
						: size === 'large'
							? 'split-chevron-size-large'
							: 'split-chevron-size-medium'} transition-transform duration-150 {open
						? 'rotate-180'
						: ''}"
				/>
			</button>
		</div>
	</div>

	{#if open}
		<div
			bind:this={menuPanel}
			class="absolute z-50 w-max max-w-72 min-w-full overflow-hidden rounded-md border border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800 {dropUp
				? 'bottom-full mb-1'
				: 'top-full mt-1'}"
			class:left-0={!alignMenuEnd}
			class:right-0={alignMenuEnd}
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
				class="block max-w-full min-w-full px-4 py-2 text-left text-lg wrap-break-word whitespace-normal text-stone-800 hover:bg-stone-100 sm:whitespace-nowrap dark:text-stone-200 dark:hover:bg-stone-700"
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
