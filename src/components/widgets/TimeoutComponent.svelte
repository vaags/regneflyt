<script lang="ts">
	import { onDestroy, onMount, createEventDispatcher } from 'svelte'
	import { tweened } from 'svelte/motion'
	import { TimerState } from '../../models/constants/TimerState'
	import TimeComponent from './TimeComponent.svelte'

	export let seconds: number
	export let state: TimerState = TimerState.Started
	export let fadeOnSecondChange = false
	export let showMinutes = false
	export let showProgressBar = false
	export let hidden = false
	export let countToZero = true
	export let customDisplayWords: string[] | undefined = undefined

	const millisecondIntervalDuration = 100
	const percentageTweened = tweened(0, {
		duration: millisecondIntervalDuration
	})
	const dispatch = createEventDispatcher()

	let internalState: TimerState = TimerState.Initialized
	let timeoutHandler: number
	let millisecondsIntervalHandler: number
	let secondsIntervalHandler: number
	let secondIntervalDelayHandler: number
	let millisecondIntervalDelayHandler: number
	const milliseconds = seconds * 1000
	let remainingSeconds = seconds
	let remainingMilliseconds: number
	let transparentText = false
	let percentageCompleted = 0
	let timestampStart: number
	let timestampStop: number
	const transitionDelayCompensation = millisecondIntervalDuration // Because of transition delay (tweening), internal time keeping must be 100 ms ahead of actual time left.

	$: if (state && internalState !== state) {
		handleStateChange()
		internalState = state
	}

	function handleStateChange() {
		switch (state) {
			case TimerState.Started:
				start(undefined)
				break
			case TimerState.Resumed:
				start(remainingMilliseconds)
				break
			case TimerState.Stopped:
				stop()
				break
		}
	}

	function start(resumeMilliseconds: number | undefined) {
		timestampStart = Date.now()
		clearTimeHandlers()
		setInitialProgress(resumeMilliseconds)

		timeoutHandler = window.setTimeout(
			finished,
			resumeMilliseconds ?? milliseconds
		)

		// Decrementers must be delayed to account for completion and pauses in-between seconds
		const secondDecrementDelay = remainingMilliseconds % 1000
		const millisecondDecrementDelay =
			remainingMilliseconds % millisecondIntervalDuration

		secondIntervalDelayHandler = window.setTimeout(() => {
			if (secondDecrementDelay > 0) decrementSecond()
			secondsIntervalHandler = window.setInterval(decrementSecond, 1000)
		}, secondDecrementDelay)

		millisecondIntervalDelayHandler = window.setTimeout(() => {
			if (millisecondDecrementDelay > 0) decrementMillisecond()
			millisecondsIntervalHandler = window.setInterval(
				decrementMillisecond,
				millisecondIntervalDuration
			)
		}, millisecondDecrementDelay)
	}

	function setInitialProgress(resumeMilliseconds: number | undefined) {
		percentageCompleted = (100 / milliseconds) * transitionDelayCompensation
		remainingSeconds = resumeMilliseconds
			? Math.floor(resumeMilliseconds / 1000)
			: countToZero
				? seconds - 1
				: seconds
		remainingMilliseconds = resumeMilliseconds ?? milliseconds
	}

	function decrementMillisecond() {
		remainingMilliseconds -= millisecondIntervalDuration
		percentageCompleted =
			((milliseconds - (remainingMilliseconds - transitionDelayCompensation)) /
				milliseconds) *
			100
	}

	function decrementSecond() {
		remainingSeconds--
		if (fadeOnSecondChange) fadeOut()
		dispatch('secondChange', { remainingSeconds })
	}

	function stop() {
		timestampStop = Date.now()
		const millisecondRest =
			(timestampStop - timestampStart) % millisecondIntervalDuration
		remainingMilliseconds -= millisecondRest // Remove the time passed since the last millisecond decrement (for more accurate timing when resuming after pause)
		clearTimeHandlers()
	}

	function finished() {
		clearTimeHandlers()
		percentageCompleted = 100
		dispatch('finished')
	}

	function fadeOut() {
		transparentText = false
		setTimeout(() => {
			transparentText = true
		}, 500)
	}

	function clearTimeHandlers() {
		clearInterval(millisecondsIntervalHandler)
		clearInterval(secondsIntervalHandler)
		clearTimeout(secondIntervalDelayHandler)
		clearTimeout(timeoutHandler)
		clearTimeout(millisecondIntervalDelayHandler)
	}

	onMount(() => {
		if (fadeOnSecondChange) fadeOut()
	})

	onDestroy(() => {
		clearTimeHandlers()
	})

	$: percentageTweened.set(percentageCompleted)
</script>

{#if !hidden && internalState}
	<div
		class="{fadeOnSecondChange ? 'transition duration-1000 ease-out' : ''}
        {transparentText ? 'opacity-0' : ''}"
	>
		{#if showMinutes}
			<TimeComponent seconds={remainingSeconds} />
		{:else if showProgressBar}
			<div class="w-24 sm:w-32 md:w-40">
				<div
					class="w-full overflow-hidden rounded border border-gray-500 bg-white"
				>
					<div
						class="flex items-center justify-center text-gray-50 transition-colors
                            duration-200 {percentageCompleted === 100
							? 'bg-red-600'
							: 'bg-blue-400'}
                            "
						style="width: {$percentageTweened}%"
					>
						<slot />
					</div>
				</div>
			</div>
		{:else}{customDisplayWords
				? customDisplayWords[remainingSeconds - 1]
				: remainingSeconds}{/if}
	</div>
{/if}
