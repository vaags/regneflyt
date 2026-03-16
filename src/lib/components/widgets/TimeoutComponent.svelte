<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte'
	import { TimerState } from '$lib/constants/TimerState'
	import { AppSettings } from '$lib/constants/AppSettings'
	import TimeComponent from './TimeComponent.svelte'
	import * as m from '$lib/paraglide/messages.js'

	let {
		seconds,
		timerState = TimerState.Started,
		fadeOnSecondChange = false,
		showMinutes = false,
		showProgressBar = false,
		hidden = false,
		customDisplayWords = undefined,
		onSecondChange = () => {},
		onFinished = () => {}
	}: {
		seconds: number
		timerState?: TimerState
		fadeOnSecondChange?: boolean
		showMinutes?: boolean
		showProgressBar?: boolean
		hidden?: boolean
		customDisplayWords?: string[] | undefined
		onSecondChange?: (remainingSeconds: number) => void
		onFinished?: () => void
	} = $props()

	const initialSeconds = untrack(() => seconds)
	const totalMilliseconds = initialSeconds * 1000
	const resetDuration = AppSettings.transitionDuration.duration / 1000

	let internalState: TimerState = $state(
		untrack(() => showProgressBar) ? TimerState.Stopped : TimerState.Initialized
	)
	let remainingSeconds = $state(initialSeconds)
	let remainingMilliseconds = totalMilliseconds
	let transparentText = $state(false)
	let timestampStart = 0
	let barWidth = $state(0)
	let barDuration = $state(0)
	let isFinished = false
	let barEl: HTMLDivElement | undefined = $state()

	let timers = {
		timeout: 0,
		interval: 0,
		intervalDelay: 0
	}

	function clearTimers() {
		clearTimeout(timers.timeout)
		clearTimeout(timers.intervalDelay)
		clearInterval(timers.interval)
	}

	function decrementSecond() {
		remainingSeconds--
		if (fadeOnSecondChange) fadeOut()
		onSecondChange(remainingSeconds)
	}

	function start(resumeMs?: number) {
		clearTimers()
		isFinished = false
		timestampStart = Date.now()

		remainingMilliseconds = resumeMs ?? totalMilliseconds
		remainingSeconds = resumeMs ? Math.floor(resumeMs / 1000) : seconds

		// Align the first second tick to the sub-second remainder
		const firstTickDelay = remainingMilliseconds % 1000
		timers.intervalDelay = window.setTimeout(() => {
			if (firstTickDelay > 0) decrementSecond()
			timers.interval = window.setInterval(decrementSecond, 1000)
		}, firstTickDelay)

		timers.timeout = window.setTimeout(finished, remainingMilliseconds)
		barDuration = remainingMilliseconds / 1000
		barWidth = 100
	}

	function stop() {
		clearTimers()

		if (!isFinished) {
			const elapsed = Date.now() - timestampStart
			remainingMilliseconds = Math.max(0, remainingMilliseconds - elapsed)
		}

		barDuration = resetDuration
		barWidth = 0
	}

	function pause() {
		const elapsed = Date.now() - timestampStart
		clearTimers()

		if (!isFinished) {
			remainingMilliseconds = Math.max(0, remainingMilliseconds - elapsed)
		}

		// Read the actual rendered width from the DOM to avoid any jump.
		if (barEl) {
			const computed = getComputedStyle(barEl).width
			const parentWidth = barEl.parentElement?.clientWidth || 1
			barDuration = 0
			barWidth = (parseFloat(computed) / parentWidth) * 100
		} else {
			barDuration = 0
		}
	}

	function finished() {
		clearTimers()
		isFinished = true
		barDuration = 0
		barWidth = 100
		onFinished()
	}

	function fadeOut() {
		transparentText = false
		setTimeout(() => {
			transparentText = true
		}, 500)
	}

	$effect(() => {
		if (timerState && untrack(() => internalState) !== timerState) {
			switch (timerState) {
				case TimerState.Started:
					start()
					break
				case TimerState.Resumed:
					start(remainingMilliseconds)
					break
				case TimerState.Stopped:
					stop()
					break
				case TimerState.Paused:
					pause()
					break
			}
			internalState = timerState
		}
	})

	onMount(() => {
		if (fadeOnSecondChange) fadeOut()
	})

	onDestroy(() => {
		clearTimers()
	})
</script>

{#if !hidden && internalState}
	<div
		class="{fadeOnSecondChange ? 'transition duration-1000 ease-out' : ''}
             {transparentText ? 'opacity-0' : ''}"
	>
		{#if showMinutes}
			<TimeComponent seconds={remainingSeconds} />
		{:else if showProgressBar}
			<div class="w-12 sm:w-16 md:w-20">
				<div
					class="relative h-1 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
					role="progressbar"
					aria-valuenow={Math.round(barWidth)}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={m.sr_progress_bar()}
				>
					<div
						bind:this={barEl}
						class="absolute inset-y-0 left-0 rounded-full bg-sky-500"
						data-testid="progress-bar"
						style="width: {barWidth}%; transition: width {barDuration}s linear"
					></div>
				</div>
			</div>
		{:else}
			{customDisplayWords
				? customDisplayWords[remainingSeconds - 1]
				: remainingSeconds}
		{/if}
	</div>
{/if}
