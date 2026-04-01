<script lang="ts">
	import { fly } from 'svelte/transition'
	import { cubicIn, cubicOut } from 'svelte/easing'
	import { AppSettings } from '$lib/constants/AppSettings'
	import type { StickyGlobalNavQuizControls } from '$lib/contexts/stickyGlobalNavContext'
	import NumpadComponent from '$lib/components/widgets/NumpadComponent.svelte'

	let {
		quizControls = undefined
	}: {
		quizControls?: StickyGlobalNavQuizControls | undefined
	} = $props()

	const trayTransitionDuration = Math.round(
		AppSettings.transitionDuration.duration * 0.7
	)
</script>

{#if quizControls}
	<div
		in:fly={{
			y: 16,
			opacity: 0,
			duration: trayTransitionDuration,
			easing: cubicOut
		}}
		out:fly={{
			y: 16,
			opacity: 0,
			duration: trayTransitionDuration,
			easing: cubicIn
		}}
		class="relative z-40"
		style="margin-bottom: var(--sticky-global-nav-clearance);"
		data-testid="quiz-input-tray"
	>
		<div class="container mx-auto w-full max-w-sm px-2 md:max-w-md md:px-4">
			<div
				class="panel-surface pointer-events-auto w-full rounded-md px-2 py-3 shadow-[0_-6px_14px_-12px_rgba(15,23,42,0.22),0_8px_16px_-14px_rgba(15,23,42,0.16)] ring-1 ring-stone-300/55 md:px-3 md:py-4 dark:shadow-[0_-8px_18px_-14px_rgba(0,0,0,0.36),0_10px_18px_-14px_rgba(0,0,0,0.28)] dark:ring-stone-700/65"
			>
				<NumpadComponent
					value={quizControls.value}
					disabled={quizControls.disabled}
					disabledNext={quizControls.disabledNext}
					nextButtonColor={quizControls.nextButtonColor}
					onValueChange={quizControls.onValueChange}
					onCompletePuzzle={quizControls.onCompletePuzzle}
				/>
			</div>
		</div>
	</div>
{/if}
