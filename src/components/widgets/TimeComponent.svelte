<script lang="ts">
	let { seconds }: { seconds: number } = $props()

	let minutes = $derived(Math.floor(seconds / 60))
	let remainderSeconds = $derived(seconds - minutes * 60)
	let time = $derived(
		`${padWithLeadingZero(minutes)}:${padWithLeadingZero(remainderSeconds)}`
	)

	function padWithLeadingZero(number: number) {
		return String(number).padStart(2, '0')
	}
</script>

<span>{time}</span>
