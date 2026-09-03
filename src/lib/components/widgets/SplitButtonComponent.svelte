<script lang="ts">
	import type { Snippet } from 'svelte'
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

	let wrapper = $state<HTMLDivElement | undefined>(undefined)
	let toggleBtn = $state<HTMLButtonElement | undefined>(undefined)
	let menuPanel = $state<HTMLDivElement | undefined>(undefined)
	let menuItemBtn = $state<HTMLButtonElement | undefined>(undefined)
	const componentId = $props.id()
	const menuId = `${componentId}-menu`

	function updateMenuLayout() {
		if (!wrapper || !menuPanel) return

		const viewportGutter = 8
		const gap = 4
		const triggerRect = wrapper.getBoundingClientRect()
		const availableWidth = Math.max(0, window.innerWidth - viewportGutter * 2)
		const availableHeight = Math.max(0, window.innerHeight - viewportGutter * 2)

		menuPanel.style.minWidth = `${Math.min(triggerRect.width, availableWidth)}px`
		menuPanel.style.maxWidth = `${availableWidth}px`
		menuPanel.style.maxHeight = `${availableHeight}px`

		const menuRect = menuPanel.getBoundingClientRect()
		const width = menuRect.width
		const preferredLeft = triggerRect.left
		const left = Math.min(
			Math.max(preferredLeft, viewportGutter),
			window.innerWidth - viewportGutter - width
		)
		const spaceAbove = triggerRect.top - viewportGutter
		const spaceBelow = window.innerHeight - triggerRect.bottom - viewportGutter
		const opensUpward =
			wrapper.closest('[data-sticky-global-nav]') !== null ||
			spaceAbove >= menuRect.height + gap ||
			spaceAbove > spaceBelow
		const top = opensUpward
			? Math.max(viewportGutter, triggerRect.top - gap - menuRect.height)
			: Math.min(
					window.innerHeight - viewportGutter - menuRect.height,
					triggerRect.bottom + gap
				)

		menuPanel.style.left = `${left}px`
		menuPanel.style.top = `${top}px`
	}

	function showMenu() {
		if (!menuPanel || menuPanel.matches(':popover-open')) return
		menuPanel.showPopover()
	}

	function hideMenu(restoreFocus = false) {
		if (menuPanel?.matches(':popover-open')) menuPanel.hidePopover()
		if (restoreFocus) toggleBtn?.focus()
	}

	function handlePopoverToggle(event: ToggleEvent) {
		open = event.newState === 'open'
		if (open) {
			updateMenuLayout()
			menuItemBtn?.focus()
		}
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault()
			hideMenu(true)
		} else if (
			e.key === 'ArrowUp' ||
			e.key === 'ArrowDown' ||
			e.key === 'Home' ||
			e.key === 'End'
		) {
			e.preventDefault()
			menuItemBtn?.focus()
		} else if (e.key === 'Tab') {
			hideMenu()
		}
	}

	function handleToggleKeydown(e: KeyboardEvent) {
		if (!secondaryEnabled) return
		if (e.key === 'Escape' && open) {
			e.preventDefault()
			hideMenu(true)
		} else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
			e.preventDefault()
			showMenu()
		}
	}

	$effect.pre(() => {
		if (secondaryEnabled) return
		hideMenu()
		open = false
	})
</script>

<svelte:window onresize={() => open && updateMenuLayout()} />

<div class={fullWidth ? 'w-full' : 'inline-flex'} bind:this={wrapper}>
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
				onkeydown={handleToggleKeydown}
				disabled={!secondaryEnabled}
				tabindex={secondaryEnabled ? 0 : -1}
				popovertarget={secondaryEnabled ? menuId : undefined}
				aria-haspopup={secondaryEnabled ? 'menu' : undefined}
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

	{#if secondaryEnabled}
		<div
			bind:this={menuPanel}
			id={menuId}
			popover="auto"
			class="fixed [inset:unset] m-0 w-max overflow-x-hidden overflow-y-auto rounded-md border border-stone-300 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800"
			role="menu"
			tabindex="-1"
			ontoggle={handlePopoverToggle}
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
					hideMenu(true)
					onSecondaryClick?.(e)
				}}
			>
				{secondaryLabel}
			</button>
		</div>
	{/if}
</div>
