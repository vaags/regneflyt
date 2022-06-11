<script lang="ts">
	import { onMount, afterUpdate } from 'svelte'

	export let value: number | undefined = undefined
	export let displayError: boolean
	export let disabled: boolean = false
	export let focus: boolean = true
	let ref: any

	function focusInput() {
		if (focus) {
			ref.focus()
		}
	}

	afterUpdate(() => {
		focusInput()
	})

	onMount(() => {
		focusInput()
	})
</script>

<input
	{disabled}
	bind:value
	bind:this={ref}
	class="border {displayError ? 'border-red-600' : ''} w-24 rounded py-2
        px-3 text-4xl leading-tight focus:outline-none md:text-5xl"
	type="number"
	inputmode="numeric"
	pattern="[0-9]*"
	placeholder="?"
/>

<style>
	/* Removes arrows from number input */

	input::-webkit-inner-spin-button,
	input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input {
		-moz-appearance: textfield;
	}

	::-webkit-input-placeholder {
		text-align: center;
	}

	::-moz-placeholder {
		text-align: center;
	}
</style>
