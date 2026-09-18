<script lang="ts">
	import { fade, fly } from 'svelte/transition'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import { button_close } from '#lib/paraglide/messages.js'
	import { notificationTiming } from '#lib/stores.ts'

	let {
		message,
		variant = 'success',
		bottomNavSize = 'none',
		testId = undefined,
		autoDismissMs = undefined,
		onDismiss = () => {}
	}: {
		message: string
		variant?: 'success' | 'error'
		bottomNavSize?: 'none' | 'compact' | 'expanded'
		testId?: string | undefined
		autoDismissMs?: number | null | undefined
		onDismiss?: () => void
	} = $props()

	const successDismissMs = 3500
	const errorDismissMs = 6500

	const dismissDelayMs = $derived(
		autoDismissMs === undefined
			? notificationTiming.current === 'persistent'
				? null
				: variant === 'success'
					? successDismissMs
					: errorDismissMs
			: autoDismissMs
	)

	const dismiss = () => {
		onDismiss()
	}

	$effect(() => {
		if (typeof window === 'undefined' || dismissDelayMs === null) return

		const timeoutId = window.setTimeout(() => {
			dismiss()
		}, dismissDelayMs)

		return () => {
			window.clearTimeout(timeoutId)
		}
	})
</script>

<div
	class="toast-root"
	data-global-toast
	data-bottom-nav-size={bottomNavSize}
	data-testid={testId}
>
	<!-- Success announcements come from the persistent polite region in the
	     layout; only errors need to interrupt. -->
	<div
		class="toast"
		data-variant={variant}
		in:fly|global={{ ...AppSettings.transitionDuration, y: 8 }}
		out:fade|global={AppSettings.transitionDuration}
	>
		<div class="toast__content">
			<p
				class="toast__message"
				data-testid="toast-message"
				role={variant === 'error' ? 'alert' : undefined}
				aria-atomic={variant === 'error' ? 'true' : undefined}
			>
				{message}
			</p>
			<button
				type="button"
				data-testid="btn-toast-dismiss"
				class="toast__dismiss focus-indicator expanded-hit-area"
				aria-label={button_close()}
				onclick={dismiss}>&times;</button
			>
		</div>
	</div>
</div>

<style>
	.toast-root {
		position: fixed;
		inset-inline: 0;
		bottom: 1rem;
		z-index: 50;
		display: flex;
		justify-content: center;
		padding-inline: 1rem;
		pointer-events: none;
		view-transition-name: global-toast;
	}

	.toast-root[data-bottom-nav-size='compact'] {
		bottom: calc(
			var(--measured-global-nav-height, var(--sticky-global-nav-clearance)) +
				0.5rem
		);
	}

	.toast-root[data-bottom-nav-size='expanded'] {
		bottom: calc(
			var(
					--measured-global-nav-height,
					var(--sticky-global-nav-expanded-clearance)
				) +
				0.5rem
		);
	}

	.toast {
		inline-size: 100%;
		max-inline-size: 28rem;
		padding: 0.75rem 1rem;
		border: 1px solid;
		border-radius: var(--radius-control);
		box-shadow: var(--shadow-elevated);
		pointer-events: auto;
	}

	.toast[data-variant='success'] {
		border-color: var(--color-positive-300);
		background: var(--color-positive-50);
		color: var(--color-positive-950);
	}

	.toast[data-variant='error'] {
		border-color: var(--color-danger-300);
		background: var(--color-danger-50);
		color: var(--color-danger-950);
	}

	.toast__content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.toast__message {
		font-size: 1rem;
	}

	.toast__dismiss {
		margin: -0.25rem;
		padding: 0.25rem;
		border-radius: 0.25rem;
		background: transparent;
		line-height: 1;
		opacity: 0.7;
		transition: opacity 150ms;
	}

	.toast__dismiss:hover,
	.toast__dismiss:focus-visible {
		opacity: 1;
	}

	:global(.dark) .toast[data-variant='success'] {
		border-color: color-mix(
			in srgb,
			var(--color-positive-800) 80%,
			transparent
		);
		background: color-mix(in srgb, var(--color-positive-900) 85%, transparent);
		color: var(--color-positive-100);
	}

	:global(.dark) .toast[data-variant='error'] {
		border-color: color-mix(in srgb, var(--color-danger-800) 80%, transparent);
		background: color-mix(in srgb, var(--color-danger-900) 85%, transparent);
		color: var(--color-danger-100);
	}
</style>
