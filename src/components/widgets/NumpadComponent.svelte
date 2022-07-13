<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import NumpadButtonComponent from './NumpadButtonComponent.svelte'

	export let value: number | undefined = undefined
	export let disabledNext: boolean = false
	export let puzzleTimeout: boolean = false
	export let nextButtonColor: 'red' | 'yellow' | 'green' | 'gray' = 'gray'

	const dispatch = createEventDispatcher()

	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]

	function onKeyDown(e: KeyboardEvent) {
		if (puzzleTimeout) return

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
			case '-':
				setNegativeNumber()
				break
			default:
				handleInput(e.key)
				break
		}
	}

	function onClick(i: string) {
		if (puzzleTimeout) return

		if (i === '-') {
			setNegativeNumber()
			return
		}

		handleInput(i)
	}

	function setNegativeNumber() {
		value === undefined ? (value = -0) : (value = value * -1)
	}

	function handleInput(i: string): void {
		if (isNaN(parseInt(i))) return

		if (parseInt(i) === 0 && value === 0) return

		if (value && value.toString().length >= 4) {
			return
		}

		if (value === undefined) {
			value = parseInt(i)
			return
		}

		if (Object.is(value, -0)) {
			value = parseInt(i) * -1
			return
		}

		value = parseInt(`${value}${i}`)
	}

	function resetInput() {
		value = undefined
	}

	function removeLastDigit() {
		if (value === undefined) return

		if (value === -0 || (value > 0 && value < 10)) {
			value = undefined
			return
		}
		const isNegative = value < 0

		value = parseInt(value.toString().slice(0, -1))

		if (isNaN(value)) {
			isNegative ? (value = -0) : (value = undefined)
		}
	}

	function completePuzzle() {
		if (disabledNext || value === undefined) return

		dispatch('completePuzzle')
	}
</script>

<div class="container mx-auto w-56 touch-none sm:w-64 md:w-80">
	<div class="mb-1.5 grid grid-cols-3 gap-1.5 text-center text-gray-800">
		{#each digits as i}
			<NumpadButtonComponent on:click={() => onClick(i.toString())}>
				{i}
			</NumpadButtonComponent>
		{/each}
		<NumpadButtonComponent on:click={() => onClick('-')}>&minus;</NumpadButtonComponent>
		<NumpadButtonComponent on:click={() => onClick('0')}>0</NumpadButtonComponent>
		<NumpadButtonComponent color="red" on:click={() => resetInput()}>Slett</NumpadButtonComponent>
	</div>
	<NumpadButtonComponent
		{puzzleTimeout}
		color={nextButtonColor}
		on:click={() => completePuzzle()}
		disabled={disabledNext}
	>
		Neste
	</NumpadButtonComponent>
</div>

<svelte:window on:keydown|preventDefault={(event) => onKeyDown(event)} />
