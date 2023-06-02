<script lang="ts">
	import { tweened } from 'svelte/motion'
	import { sineOut } from 'svelte/easing'

	export let value: number
	export let duration = 200

	const valueTweened = tweened(0, {
		duration: duration,
		easing: sineOut
	})

	$: valueTweened.set(value)
</script>

{Math.round($valueTweened)}
