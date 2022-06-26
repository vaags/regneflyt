<script lang="ts">
	let input: any
	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

	function onKeyDown(e: { key: any; keyCode: any }) {
		console.log('entered keycode', e.keyCode)
		if (e.keyCode === 8 && !isNaN(input)) {
			// 8 = Backspace
			console.log('removing last digit')
			input = removeLastDigit(input)
		} else if (e.keyCode === 46 && !isNaN(input)) {
			// 46 == Delete
			console.log('removing first digit')
			input = removeFirstDigit(input)
		} else {
			if (isNaN(e.key)) {
				console.log('not a number, exiting')
				return
			}
			handleInput(e.key)
		}
	}

	function onClick(i: string | undefined) {
		console.log('hei', i)
		i ? handleInput(i) : (input = removeLastDigit(input))
	}

	function handleInput(i: any): void {
		if (input === undefined || isNaN(input) || parseInt(input) === 0) {
			input = i
		} else {
			input += i
		}
	}

	function removeLastDigit(i: number): number {
		return parseInt(i.toString().slice(0, -1))
	}

	function removeFirstDigit(i: number): number {
		// TODO: Skal ikke ta bort 10 ved ett trykk
		return parseInt(i.toString().slice(1, `${i}`.length))
	}
</script>

<div class="text-white">
	input: {input}
</div>

<div class="container mx-auto max-w-lg">
	<div class="grid grid-cols-3 gap-4 text-center text-xl text-white">
		{#each digits as i}
			<div class="rounded border p-3 " on:click={() => onClick(i.toString())}>
				{i}
			</div>
		{/each}
		<div class="rounded border p-3" on:click={() => onClick(undefined)}>Slett</div>
		<div class="rounded border p-3">Neste</div>
	</div>
</div>

<svelte:window on:keydown|preventDefault={onKeyDown} />
