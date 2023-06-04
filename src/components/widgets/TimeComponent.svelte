<script lang="ts">
	import { afterUpdate } from 'svelte'

	export let seconds: number

	let minutes: number | undefined
	let remainderSeconds: number | undefined
	let time: string | undefined

	afterUpdate(() => {
		minutes = Math.floor(seconds / 60)
		remainderSeconds = seconds - minutes * 60
		time = `${getTrailingZero(minutes)}:${getTrailingZero(remainderSeconds)}`
	})

	function getTrailingZero(number: number) {
		return String(number).padStart(2, '0')
	}
</script>

{#if time}
	<span>{time}</span>
{/if}
