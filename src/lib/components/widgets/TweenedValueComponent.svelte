<script lang="ts">
	import { untrack } from 'svelte'
	import { tweened } from 'svelte/motion'
	import { sineOut } from 'svelte/easing'
	import { AppSettings } from '$lib/constants/AppSettings'

	let {
		value,
		duration = AppSettings.transitionDuration.duration
	}: {
		value: number
		duration?: number
	} = $props()

	const valueTweened = tweened(0, {
		duration: untrack(() => duration),
		easing: sineOut
	})

	$effect(() => {
		valueTweened.set(value)
	})
</script>

{Math.round($valueTweened)}
