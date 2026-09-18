<script lang="ts">
	import type { Snippet } from 'svelte'
	import {
		type ButtonSize,
		type ButtonColor,
		type ButtonVariant
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

<div
	class="split-button"
	data-full-width={fullWidth || undefined}
	bind:this={wrapper}
>
	<div
		class="split-button__control"
		data-color={color}
		data-variant={variant}
		data-size={size}
	>
		<button
			type="button"
			onclick={(e) => {
				e.preventDefault()
				onclick(e)
			}}
			class="split-button__primary focus-indicator"
			data-connected={secondaryEnabled || undefined}
			data-testid={testId}
		>
			{@render children()}
		</button>
		<div
			class="split-button__secondary"
			data-enabled={secondaryEnabled || undefined}
			aria-hidden={!secondaryEnabled}
		>
			<div class="split-button__divider-shell" aria-hidden="true">
				<span class="split-button__divider"></span>
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
				class="split-button__toggle focus-indicator"
				data-testid={secondaryEnabled && testId
					? `${testId}-toggle`
					: undefined}
			>
				<span class="split-button__chevron" data-open={open || undefined}>
					<ChevronDownComponent />
				</span>
			</button>
		</div>
	</div>

	{#if secondaryEnabled}
		<div
			bind:this={menuPanel}
			id={menuId}
			popover="auto"
			class="split-button__menu"
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
				class="split-button__menu-item"
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

<style>
	.split-button {
		display: inline-flex;
	}

	.split-button[data-full-width='true'] {
		display: flex;
		inline-size: 100%;
	}

	.split-button__control {
		display: inline-flex;
		overflow: hidden;
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		transition: transform 200ms ease-out;
	}

	.split-button[data-full-width='true'] .split-button__control {
		inline-size: 100%;
	}

	.split-button__control:active {
		transform: scale(0.97);
	}

	.split-button__control[data-size='small'] {
		block-size: 2.75rem;
	}

	.split-button__control[data-size='medium'] {
		block-size: 3rem;
	}

	.split-button__control[data-size='large'] {
		block-size: 3.5rem;
	}

	.split-button__primary,
	.split-button__toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		block-size: 100%;
		min-block-size: 0;
		border: 0;
		background: transparent;
		font-weight: 400;
		line-height: 1;
		transition:
			background-color 200ms ease-out,
			color 200ms ease-out,
			box-shadow 200ms ease-out;
	}

	.split-button__primary {
		border-radius: var(--radius-control);
	}

	.split-button__primary[data-connected='true'] {
		border-start-end-radius: 0;
		border-end-end-radius: 0;
	}

	.split-button[data-full-width='true'] .split-button__primary {
		flex: 1;
	}

	.split-button__toggle {
		border-start-end-radius: var(--radius-control);
		border-end-end-radius: var(--radius-control);
	}

	.split-button__control[data-size='small'] .split-button__primary {
		min-inline-size: 2.75rem;
		padding-inline: 1rem;
		font-size: 1.25rem;
	}

	.split-button__control[data-size='medium'] .split-button__primary {
		min-inline-size: 3rem;
		padding-inline: 1.25rem;
		font-size: 1.5rem;
	}

	.split-button__control[data-size='large'] .split-button__primary {
		min-inline-size: 3.5rem;
		padding-inline: 1.5rem;
		font-size: 1.875rem;
	}

	.split-button__control[data-size='small'] .split-button__toggle {
		min-inline-size: 2.75rem;
		padding-inline: 0.75rem;
	}

	.split-button__control[data-size='medium'] .split-button__toggle {
		min-inline-size: 3rem;
		padding-inline: 0.75rem;
	}

	.split-button__control[data-size='large'] .split-button__toggle {
		min-inline-size: 3.5rem;
		padding-inline: 1rem;
	}

	.split-button__secondary {
		display: flex;
		max-inline-size: 0;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
		transition:
			max-inline-size 200ms ease-out,
			opacity 200ms ease-out;
	}

	.split-button__secondary[data-enabled='true'] {
		max-inline-size: 5rem;
		opacity: 1;
		pointer-events: auto;
	}

	.split-button__divider-shell {
		display: flex;
		align-items: center;
	}

	.split-button__divider {
		display: block;
		inline-size: 1px;
		block-size: 75%;
	}

	.split-button__chevron {
		font-size: 2rem;
		transition: transform 150ms;
	}

	.split-button__control[data-size='small'] .split-button__chevron {
		font-size: 1.5rem;
	}

	.split-button__control[data-size='large'] .split-button__chevron {
		font-size: 2.25rem;
	}

	.split-button__chevron[data-open='true'] {
		transform: rotate(180deg);
	}

	.split-button__control[data-variant='solid'] {
		color: white;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
	}

	.split-button__control[data-variant='solid'] .split-button__divider {
		background: rgb(255 255 255 / 0.4);
	}

	.split-button__control[data-color='blue'] {
		--control-background: var(--color-primary-900);
		--control-border: var(--color-primary-950);
		--control-text: var(--color-primary-800);
		--control-focus: var(--color-primary-700);
	}

	.split-button__control[data-color='green'] {
		--control-background: var(--color-positive-800);
		--control-border: var(--color-positive-900);
		--control-text: var(--color-positive-800);
		--control-focus: var(--color-positive-700);
	}

	.split-button__control[data-color='red'] {
		--control-background: var(--color-danger-800);
		--control-border: var(--color-danger-900);
		--control-text: var(--color-danger-800);
		--control-focus: var(--color-danger-700);
	}

	.split-button__control[data-color='gray'] {
		--control-background: var(--color-neutral-600);
		--control-border: var(--color-neutral-700);
		--control-text: var(--color-neutral-800);
		--control-focus: var(--color-neutral-700);
	}

	:global(.dark) .split-button__control[data-color='blue'] {
		--control-border: var(--color-primary-400);
		--control-text: var(--color-primary-200);
		--control-focus: var(--color-primary-300);
	}

	:global(.dark) .split-button__control[data-color='green'] {
		--control-border: var(--color-positive-400);
		--control-text: var(--color-positive-200);
		--control-focus: var(--color-positive-300);
	}

	:global(.dark) .split-button__control[data-color='red'] {
		--control-border: var(--color-danger-400);
		--control-text: var(--color-danger-200);
		--control-focus: var(--color-danger-300);
	}

	:global(.dark) .split-button__control[data-color='gray'] {
		--control-border: var(--color-neutral-400);
		--control-text: var(--color-neutral-200);
		--control-focus: var(--color-neutral-300);
	}

	.split-button__control[data-variant='solid'] {
		border-color: var(--control-border);
		background: var(--control-background);
	}

	.split-button__control[data-variant='solid'] .split-button__primary,
	.split-button__control[data-variant='solid'] .split-button__toggle,
	.split-button__control[data-variant='solid'] .split-button__divider-shell {
		background: var(--control-background);
		color: white;
	}

	.split-button__control[data-variant='outline'] {
		border-color: var(--control-border);
		color: var(--control-text);
	}

	.split-button__control[data-variant='outline'] .split-button__primary,
	.split-button__control[data-variant='outline'] .split-button__toggle {
		color: var(--control-text);
	}

	.split-button__control[data-variant='outline'] .split-button__divider {
		background: color-mix(in srgb, var(--control-focus) 50%, transparent);
	}

	.split-button__menu {
		position: fixed;
		inset: unset;
		margin: 0;
		inline-size: max-content;
		max-inline-size: calc(100vw - 1rem);
		max-block-size: calc(100vh - 1rem);
		overflow: auto;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-control);
		background: var(--color-surface-raised);
		box-shadow: var(--shadow-elevated);
	}

	.split-button__menu-item {
		display: block;
		min-inline-size: 100%;
		max-inline-size: 100%;
		padding: 0.5rem 1rem;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 1.125rem;
		text-align: start;
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.split-button__menu-item:hover {
		background: var(--color-surface-subtle);
	}

	@media (min-width: 40rem) {
		.split-button__menu-item {
			white-space: nowrap;
		}
	}
</style>
