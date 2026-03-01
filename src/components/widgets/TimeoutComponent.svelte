<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { tweened } from 'svelte/motion'
	import { TimerState } from '../../models/constants/TimerState'
	import TimeComponent from './TimeComponent.svelte'

	// Props
	export let seconds: number
	export let state: TimerState = TimerState.Started
	export let fadeOnSecondChange = false
	export let showMinutes = false
	export let showProgressBar = false
	export let hidden = false
	export let countToZero = true
	export let customDisplayWords: string[] | undefined = undefined
	export let onSecondChange: (remainingSeconds: number) => void = () => {}
	export let onFinished: () => void = () => {}

	// Constants
	const millisecondIntervalDuration = 100
	const milliseconds = seconds * 1000
	const transitionDelayCompensation = millisecondIntervalDuration // For transition delay

	// State variables
	let internalState: TimerState = TimerState.Initialized
	let remainingSeconds = seconds
	let remainingMilliseconds: number
	let transparentText = false
	let percentageCompleted = 0
	let timestampStart: number
	let timestampStop: number

	// Timer handlers
	let timeoutHandler: number
	let millisecondsIntervalHandler: number
	let secondsIntervalHandler: number
	let secondIntervalDelayHandler: number
	let millisecondIntervalDelayHandler: number

	// Animations
	const percentageTweened = tweened(0, {
		duration: millisecondIntervalDuration
	})

	// React to state changes
	$: if (state && internalState !== state) {
		handleStateChange()
		internalState = state
	}

	// Update tweened percentage
	$: percentageTweened.set(percentageCompleted)

	function handleStateChange() {
		switch (state) {
			case TimerState.Started:
				start()
				break
			case TimerState.Resumed:
				start(remainingMilliseconds)
				break
			case TimerState.Stopped:
				stop()
				break
		}
	}

	function start(resumeMilliseconds?: number) {
		timestampStart = Date.now()
		clearTimeHandlers()
		setInitialProgress(resumeMilliseconds)

		// Start main timer
		timeoutHandler = window.setTimeout(
			finished,
			resumeMilliseconds ?? milliseconds
		)

		setupIntervals(resumeMilliseconds)
	}

	function setupIntervals(resumeMilliseconds?: number) {
		const secondDecrementDelay = remainingMilliseconds % 1000
		const millisecondDecrementDelay =
			remainingMilliseconds % millisecondIntervalDuration

		// Setup second decrementer
		secondIntervalDelayHandler = window.setTimeout(() => {
			if (secondDecrementDelay > 0) decrementSecond()
			secondsIntervalHandler = window.setInterval(decrementSecond, 1000)
		}, secondDecrementDelay)

		// Setup millisecond decrementer
		millisecondIntervalDelayHandler = window.setTimeout(() => {
			if (millisecondDecrementDelay > 0) decrementMillisecond()
			millisecondsIntervalHandler = window.setInterval(
				decrementMillisecond,
				millisecondIntervalDuration
			)
		}, millisecondDecrementDelay)
	}

	function setInitialProgress(resumeMilliseconds?: number) {
		percentageCompleted = (100 / milliseconds) * transitionDelayCompensation

		// Calculate remaining seconds
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
		onSecondChange(remainingSeconds)
	}

	function stop() {
		timestampStop = Date.now()
		const millisecondRest =
			(timestampStop - timestampStart) % millisecondIntervalDuration
		remainingMilliseconds -= millisecondRest // For more accurate timing when resuming
		clearTimeHandlers()
	}

	function finished() {
		clearTimeHandlers()
		percentageCompleted = 100
		onFinished()
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
					class="w-full overflow-hidden rounded border border-gray-500 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800"
				>
					<div
						class="flex items-center justify-center text-gray-50 transition-colors duration-200 dark:text-gray-100 {percentageCompleted ===
						100
							? 'bg-red-600'
							: 'bg-blue-400'}"
						style="width: {$percentageTweened}%"
					>
						<slot />
					</div>
				</div>
			</div>
		{:else}
			{customDisplayWords
				? customDisplayWords[remainingSeconds - 1]
				: remainingSeconds}
		{/if}
	</div>
{/if}
