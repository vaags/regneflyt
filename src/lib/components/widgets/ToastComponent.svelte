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

	const toastContainerBottomClass = $derived.by(() => {
		if (bottomNavSize === 'none') return 'bottom-4'
		if (bottomNavSize === 'expanded') {
			return 'bottom-[calc(var(--measured-global-nav-height,var(--sticky-global-nav-expanded-clearance))+0.5rem)]'
		}

		return 'bottom-[calc(var(--measured-global-nav-height,var(--sticky-global-nav-clearance))+0.5rem)]'
	})

	$effect(() => {
		if (typeof window === 'undefined' || dismissDelayMs === null) return

		const timeoutId = window.setTimeout(() => {
			dismiss()
		}, dismissDelayMs)

		return () => {
			window.clearTimeout(timeoutId)
		}
	})

	const variantClasses: Record<'success' | 'error', string> = {
		success:
			'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-900/85 dark:text-emerald-100',
		error:
			'border-red-300 bg-red-50 text-red-950 dark:border-red-800/80 dark:bg-red-900/85 dark:text-red-100'
	}
</script>

<div
	class="toast-root pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 {toastContainerBottomClass}"
	data-testid={testId}
>
	<!-- Success announcements come from the persistent polite region in the
	     layout; only errors need to interrupt. -->
	<div
		class="pointer-events-auto w-full max-w-md rounded-md border px-4 py-3 shadow-lg {variantClasses[
			variant
		]}"
		in:fly|global={{ ...AppSettings.transitionDuration, y: 8 }}
		out:fade|global={AppSettings.transitionDuration}
	>
		<div class="flex items-start justify-between gap-3">
			<p
				class="text-base"
				data-testid="toast-message"
				role={variant === 'error' ? 'alert' : undefined}
				aria-atomic={variant === 'error' ? 'true' : undefined}
			>
				{message}
			</p>
			<button
				type="button"
				data-testid="btn-toast-dismiss"
				class="focus-ring-surface relative -m-1 rounded p-1 leading-none opacity-70 transition-opacity after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:opacity-100 focus-visible:opacity-100"
				aria-label={button_close()}
				onclick={dismiss}>&times;</button
			>
		</div>
	</div>
</div>

<style>
	.toast-root {
		view-transition-name: global-toast;
	}
</style>
