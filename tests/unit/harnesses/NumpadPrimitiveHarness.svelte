<script lang="ts">
	import NumpadComponent from '$lib/components/widgets/NumpadComponent.svelte'

	let {
		disabled = false,
		disabledNext = false,
		onCompletePuzzle = () => {}
	}: {
		disabled?: boolean
		disabledNext?: boolean
		onCompletePuzzle?: () => void
	} = $props()

	let value = $state<number | undefined>(undefined)
</script>

<NumpadComponent bind:value {disabled} {disabledNext} {onCompletePuzzle} />
<div data-testid="numpad-value">{value ?? ''}</div>
