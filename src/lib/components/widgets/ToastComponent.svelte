<script lang="ts">
	import { fade, fly } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import { button_close } from '$lib/paraglide/messages.js'

	let {
		message,
		variant = 'success',
		hasStickyGlobalNav = false,
		testId = undefined,
		autoDismissMs = undefined,
		onDismiss = () => {}
	}: {
		message: string
		variant?: 'success' | 'error'
		hasStickyGlobalNav?: boolean
		testId?: string | undefined
		autoDismissMs?: number | undefined
		onDismiss?: () => void
	} = $props()

	const successDismissMs = 3500
	const errorDismissMs = 6500

	const dismissDelayMs = $derived(
		autoDismissMs ?? (variant === 'success' ? successDismissMs : errorDismissMs)
	)

	const dismiss = () => {
		onDismiss()
	}

	const toastContainerBottomClass = $derived(
		hasStickyGlobalNav
			? 'bottom-[calc(env(safe-area-inset-bottom)+148px)] md:bottom-[calc(env(safe-area-inset-bottom)+160px)]'
			: 'bottom-4'
	)

	$effect(() => {
		if (typeof window === 'undefined' || dismissDelayMs === undefined) return

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
	class="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 {toastContainerBottomClass}"
	style:view-transition-name={'global-toast'}
	data-testid={testId}
>
	<div
		class="pointer-events-auto w-full max-w-md rounded-md border px-4 py-3 shadow-lg {variantClasses[
			variant
		]}"
		role={variant === 'error' ? 'alert' : 'status'}
		aria-live={variant === 'error' ? 'assertive' : 'polite'}
		aria-atomic="true"
		in:fly|global={{ ...AppSettings.transitionDuration, y: 8 }}
		out:fade|global={AppSettings.transitionDuration}
	>
		<div class="flex items-start justify-between gap-3">
			<p class="text-base">{message}</p>
			<button
				type="button"
				class="-m-1 rounded p-1 leading-none opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
				aria-label={button_close()}
				onclick={dismiss}>&times;</button
			>
		</div>
	</div>
</div>
