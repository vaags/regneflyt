<script lang="ts">
	import { untrack } from 'svelte'
	import { tweened } from 'svelte/motion'
	import { sineOut } from 'svelte/easing'
	import { AppSettings } from '#lib/constants/AppSettings.ts'

	let {
		value,
		enabled = true,
		duration = AppSettings.transitionDuration.duration
	}: {
		value: number
		enabled?: boolean
		duration?: number
	} = $props()

	const valueTweened = tweened(0, {
		duration: untrack(() => duration),
		easing: sineOut
	})

	$effect(() => {
		if (!enabled) return

		void valueTweened.set(value)
	})
</script>

{Math.round($valueTweened)}
