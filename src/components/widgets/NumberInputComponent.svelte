<script lang="ts">
	let input: any

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
			if (input === undefined || isNaN(input) || parseInt(input) === 0) {
				input = e.key
			} else {
				input += e.key
			}
		}
	}

	function removeLastDigit(i: number): number {
		return parseInt(i.toString().slice(0, -1))
	}

	function removeFirstDigit(i: number): number {
		return parseInt(i.toString().slice(1, `${i}`.length))
	}
</script>

<div class="text-white">
	I'm a number component Output: <div>{input}</div>
</div>

<svelte:window on:keydown|preventDefault={onKeyDown} />
