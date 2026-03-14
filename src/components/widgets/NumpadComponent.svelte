<script lang="ts">
	import NumpadButtonComponent from './NumpadButtonComponent.svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { hapticTap } from '../../helpers/hapticHelper'

	let {
		value = $bindable(undefined),
		disabled = false,
		disabledNext = false,
		nextButtonColor = 'gray',
		onCompletePuzzle = () => {}
	}: {
		value?: number | undefined
		disabled?: boolean
		disabledNext?: boolean
		nextButtonColor?: 'red' | 'yellow' | 'green' | 'gray'
		onCompletePuzzle?: () => void
	} = $props()

	function onKeyDown(e: KeyboardEvent) {
		hapticTap()
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
		hapticTap()
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
		if (isNaN(parseInt(i, 10))) return

		if (parseInt(i, 10) === 0 && value === 0) return

		if (value && value.toString().length >= 4) {
			return
		}

		if (value === undefined) {
			value = parseInt(i, 10)
			return
		}

		if (Object.is(value, -0)) {
			value = parseInt(i, 10) * -1
			return
		}

		value = parseInt(`${value}${i}`, 10)
	}

	function resetInput() {
		value = undefined
	}

	function removeLastDigit() {
		if (value === undefined) return

		if (Object.is(value, -0) || (value > 0 && value < 10)) {
			value = undefined
			return
		}
		const isNegative = value < 0

		value = parseInt(value.toString().slice(0, -1), 10)

		if (isNaN(value)) {
			isNegative ? (value = -0) : (value = undefined)
		}
	}

	function completePuzzle() {
		if (disabled || disabledNext || value === undefined) return

		onCompletePuzzle()
	}

	function handleWindowKeyDown(event: KeyboardEvent) {
		if (
			event.key === 'Tab' ||
			event.key === 'Escape' ||
			event.metaKey ||
			event.ctrlKey ||
			event.altKey
		)
			return
		event.preventDefault()
		onKeyDown(event)
	}

	$effect(() => {
		if (disabled) return
		window.addEventListener('keydown', handleWindowKeyDown)
		return () => window.removeEventListener('keydown', handleWindowKeyDown)
	})
</script>

<div class="mx-auto w-7/12 touch-none">
	<fieldset {disabled} class="disabled:opacity-50">
		<div
			class="mb-1.5 grid grid-cols-3 gap-1.5 text-center text-gray-800 md:mb-2 md:gap-2"
		>
			{#each { length: 9 } as _, i}
				<NumpadButtonComponent
					testId="numpad-{i + 1}"
					onclick={() => onClick((i + 1).toString())}
				>
					{i + 1}
				</NumpadButtonComponent>
			{/each}
			<NumpadButtonComponent
				testId="numpad-minus"
				color="blue"
				onclick={() => onClick('-')}>&minus;</NumpadButtonComponent
			>
			<NumpadButtonComponent testId="numpad-0" onclick={() => onClick('0')}
				>0</NumpadButtonComponent
			>
			<NumpadButtonComponent
				testId="numpad-delete"
				color="red"
				onclick={() => resetInput()}>{m.button_delete()}</NumpadButtonComponent
			>
		</div>
		<NumpadButtonComponent
			testId="numpad-next"
			square={false}
			color={nextButtonColor}
			onclick={() => completePuzzle()}
			disabled={disabledNext}
		>
			{m.button_next()}
		</NumpadButtonComponent>
	</fieldset>
</div>
