<script lang="ts">
	import { createEventDispatcher } from 'svelte'

	export let value: number | undefined = undefined
	export let disabledInput: Boolean
	export let disabledNext: Boolean

	const dispatch = createEventDispatcher()

	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

	function onKeyDown(e: KeyboardEvent) {
		if (disabledInput) {
			console.log('disabled')
			return
		}
		console.log('entered key', e.key)
		switch (e.key) {
			case 'Backspace':
				console.log('removing last digit')
				removeLastDigit()
				break
			case 'Enter':
				console.log('complete puzzle')
				completePuzzle()
				break
			default:
				handleInput(e.key)
				break
		}
	}

	function onClick(i: number) {
		if (disabledInput) {
			console.log('disabled')
			return
		}
		console.log('click', i)
		handleInput(i.toString())
	}

	function handleInput(i: string): void {
		if (parseInt(i) === undefined) {
			console.log('not a number, exiting')
			return
		}

		if (value && value.toString().length >= 3) {
			console.log('maxlength reached')
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
		console.log('removing last digit')
		if (value === undefined) return
		value = parseInt(value.toString().slice(0, -1))
	}

	function completePuzzle() {
		if (disabledNext) {
			console.log('disabled next-button')
			return
		}
		console.log('complete puzzle')
		dispatch('completePuzzle')
	}
</script>

<div class="container mx-auto w-72">
	<div class="grid grid-cols-3 gap-1.5 text-center text-2xl text-gray-800">
		{#each digits as i}
			<div class="rounded border border-gray-800 bg-gray-100 p-4" on:click={() => onClick(i)}>
				{i}
			</div>
		{/each}
		<div
			class="rounded border border-red-900 bg-red-700 p-4 text-red-50	"
			on:click={() => resetInput()}
		>
			C
		</div>
		<div
			class="rounded border border-green-900 bg-green-700 p-4 text-green-50"
			on:click={() => completePuzzle()}
		>
			Neste
		</div>
	</div>
	<div class="mt-4 text-white">
		input: {value}
	</div>
</div>

<svelte:window on:keydown|preventDefault={(event) => onKeyDown(event)} />
