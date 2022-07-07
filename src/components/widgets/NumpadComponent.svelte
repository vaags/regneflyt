<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import NumpadButtonComponent from './NumpadButtonComponent.svelte'

	export let value: number | undefined = undefined
	export let disabledInput: boolean = false
	export let disabledNext: boolean = false
	export let puzzleTimeout: boolean = false
	export let nextButtonColor: 'red' | 'yellow' | 'green' | 'gray' = 'gray'

	const dispatch = createEventDispatcher()

	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

	function onKeyDown(e: KeyboardEvent) {
		if (disabledInput) return

		switch (e.key) {
			case 'Backspace':
				removeLastDigit()
				break
			case 'Delete':
				resetInput()
				break
			case 'Enter':
				completePuzzle()
				break
			default:
				handleInput(e.key)
				break
		}
	}

	function onClick(i: number) {
		if (disabledInput) return

		handleInput(i.toString())
	}

	function handleInput(i: string): void {
		if (parseInt(i) === undefined) return

		if (value && value.toString().length >= 3) {
			return
		}

		if (!value) {
			value = parseInt(i)
		} else {
			value = parseInt(`${value}${i}`)
		}
	}

	function resetInput() {
		value = undefined
	}

	function removeLastDigit() {
		if (value === undefined) return
		value = parseInt(value.toString().slice(0, -1))
	}

	function completePuzzle() {
		if (disabledNext) return

		dispatch('completePuzzle')
	}
</script>

<div class="container mx-auto max-w-xs">
	<div class="grid grid-cols-3 gap-1.5 text-center text-2xl text-gray-800">
		{#each digits as i}
			<NumpadButtonComponent on:click={() => onClick(i)}>
				{i}
			</NumpadButtonComponent>
		{/each}
		<NumpadButtonComponent color="red" on:click={() => resetInput()}>Slett</NumpadButtonComponent>
		<NumpadButtonComponent on:click={() => onClick(0)}>0</NumpadButtonComponent>
		<NumpadButtonComponent
			{puzzleTimeout}
			color={nextButtonColor}
			on:click={() => completePuzzle()}
			disabled={disabledNext}
		>
			Neste
		</NumpadButtonComponent>
	</div>
</div>

<svelte:window on:keydown|preventDefault={(event) => onKeyDown(event)} />
