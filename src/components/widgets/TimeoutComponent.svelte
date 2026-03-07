<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import { TimerState } from '../../models/constants/TimerState'
	import { AppSettings } from '../../models/constants/AppSettings'
	import TimeComponent from './TimeComponent.svelte'

	// Props
	export let seconds: number
	export let state: TimerState = TimerState.Started
	export let fadeOnSecondChange = false
	export let showMinutes = false
	export let showProgressBar = false
	export let hidden = false
	export let customDisplayWords: string[] | undefined = undefined
	export let onSecondChange: (remainingSeconds: number) => void = () => {}
	export let onFinished: () => void = () => {}

	// Constants
	const milliseconds = seconds * 1000
	const resetDuration = AppSettings.transitionDuration.duration / 1000

	// State variables
	let internalState: TimerState = showProgressBar
		? TimerState.Stopped
		: TimerState.Initialized
	let remainingSeconds = seconds
	let remainingMilliseconds: number
	let transparentText = false
	let timestampStart: number
	let barWidth = 0
	let barDuration = 0
	let isFinished = false

	// Timer handlers
	let timeoutHandler: number
	let secondsIntervalHandler: number
	let secondIntervalDelayHandler: number

	// React to state changes
	$: if (state && internalState !== state) {
		handleStateChange()
		internalState = state
	}

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
		isFinished = false
		setInitialProgress(resumeMilliseconds)

		setupIntervals()

		// Bar is already at 0% (either first mount or after stop()'s reset).
		// Animate directly to 100% over the remaining duration.
		timeoutHandler = window.setTimeout(finished, remainingMilliseconds)
		barDuration = remainingMilliseconds / 1000
		barWidth = 100
	}

	function setupIntervals() {
		const secondDecrementDelay = remainingMilliseconds % 1000
		secondIntervalDelayHandler = window.setTimeout(() => {
			if (secondDecrementDelay > 0) decrementSecond()
			secondsIntervalHandler = window.setInterval(decrementSecond, 1000)
		}, secondDecrementDelay)
	}

	function setInitialProgress(resumeMilliseconds?: number) {
		remainingSeconds = resumeMilliseconds
			? Math.floor(resumeMilliseconds / 1000)
			: seconds

		remainingMilliseconds = resumeMilliseconds ?? milliseconds
	}

	function decrementSecond() {
		remainingSeconds--
		if (fadeOnSecondChange) fadeOut()
		onSecondChange(remainingSeconds)
	}

	function stop() {
		clearTimeHandlers()

		if (!isFinished) {
			const elapsed = Date.now() - timestampStart
			remainingMilliseconds = Math.max(0, remainingMilliseconds - elapsed)
		}

		// Animate bar back to 0% over the tween duration
		barDuration = resetDuration
		barWidth = 0
	}

	function finished() {
		clearTimeHandlers()
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

	function clearTimeHandlers() {
		clearInterval(secondsIntervalHandler)
		clearTimeout(secondIntervalDelayHandler)
		clearTimeout(timeoutHandler)
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
					class="relative w-full overflow-hidden rounded border border-gray-500 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-800"
				>
					<div
						class="absolute inset-y-0 left-0 {isFinished
							? 'bg-red-600'
							: 'bg-blue-400'}"
						style="width: {barWidth}%; transition: width {barDuration}s linear, background-color 200ms"
					></div>
					<div
						class="relative flex items-center justify-center text-gray-950 dark:text-gray-100"
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
