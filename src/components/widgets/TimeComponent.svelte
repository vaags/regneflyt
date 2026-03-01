<script lang="ts">
	export let seconds: number

	$: minutes = Math.floor(seconds / 60)
	$: remainderSeconds = seconds - minutes * 60
	$: time = `${getTrailingZero(minutes)}:${getTrailingZero(remainderSeconds)}`

	function getTrailingZero(number: number) {
		return String(number).padStart(2, '0')
	}
</script>

<span>{time}</span>
