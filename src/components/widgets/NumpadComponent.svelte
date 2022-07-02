<script lang="ts">
	let input: any
	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

	function onKeyDown(e: KeyboardEvent) {
		console.log('entered key', e.key)
		switch (e.key) {
			case 'Backspace':
				console.log('removing last digit')
				input = removeLastDigit(input)
				break
			case 'Delete':
				console.log('removing first digit')
				input = removeFirstDigit(input)
				break
			default:
				handleInput(e.key)
				break
		}
	}

	function onClick(i: string | undefined) {
		console.log('click', i)
		i ? handleInput(i) : (input = removeLastDigit(input))
	}

	function handleInput(i: any): void {
		if (isNaN(i)) {
			console.log('not a number, exiting')
			return
		}
		if (input === undefined || isNaN(input) || parseInt(input) === 0) {
			input = i
		} else {
			input += i
		}
	}

	function removeLastDigit(i: any) {
		if (isNaN(i)) {
			return
		}
		return parseInt(i.toString().slice(0, -1))
	}

	function removeFirstDigit(i: any) {
		if (isNaN(i)) {
			return
		}
		return parseInt(i.toString().slice(1, `${i}`.length))
	}
</script>

<div class="container mx-auto w-64">
	<div class="grid grid-cols-3 gap-2 text-center text-xl text-gray-800">
		{#each digits as i}
			<div
				class="rounded border border-yellow-800 bg-yellow-100 p-3"
				on:click={() => onClick(i.toString())}
			>
				{i}
			</div>
		{/each}
		<div
			class="rounded border border-red-900 bg-red-700 p-3 text-red-50	"
			on:click={() => onClick(undefined)}
		>
			Slett
		</div>
		<div class="rounded border border-green-900 bg-green-700 p-3 text-green-50">Neste</div>
	</div>
	<div class="mt-4 text-white">
		input: {input}
	</div>
</div>

<svelte:window on:keydown|preventDefault={(event) => onKeyDown(event)} />
