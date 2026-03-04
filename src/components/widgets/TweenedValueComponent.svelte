<script lang="ts">
	import { tweened } from 'svelte/motion'
	import { sineOut } from 'svelte/easing'
	import { AppSettings } from '../../models/constants/AppSettings'

	export let value: number
	export let duration = AppSettings.transitionDuration.duration

	const valueTweened = tweened(0, {
		duration: duration,
		easing: sineOut
	})

	$: valueTweened.set(value)
</script>

{Math.round($valueTweened)}
