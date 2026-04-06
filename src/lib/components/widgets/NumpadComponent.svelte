<script lang="ts">
	import type { ButtonColor } from './ButtonTypes'
	import {
		button_delete,
		button_next,
		sr_numpad,
		sr_numpad_minus
	} from '$lib/paraglide/messages.js'
	import { hapticTap } from '$lib/helpers/hapticHelper'

	type NumpadNextButtonColor = Exclude<ButtonColor, 'blue'>

	let {
		value = $bindable(undefined),
		disabled = false,
		disabledNext = false,
		nextButtonColor = 'gray',
		onValueChange = undefined,
		onCompletePuzzle = () => {}
	}: {
		value?: number | undefined
		disabled?: boolean
		disabledNext?: boolean
		nextButtonColor?: NumpadNextButtonColor
		onValueChange?: ((value: number | undefined) => void) | undefined
		onCompletePuzzle?: () => void
	} = $props()

	let numpadRoot: HTMLDivElement | undefined
	const rootClass = 'w-full touch-none'
	const digitGridShellClass = 'mx-auto w-full max-w-[13rem] md:max-w-[13.5rem]'
	const digitGridClass =
		'mb-1.5 grid grid-cols-3 gap-1.25 text-center text-stone-800 md:mb-2 md:gap-2'
	const actionStackClass = 'mx-auto w-full max-w-[13rem] md:max-w-[13.5rem]'
	const squareButtonSizeClass = 'aspect-[1.06/1] w-full min-w-0'
	const wideButtonSizeClass = 'w-full px-3 py-2.5 md:px-4 md:py-3'
	const digitButtonTextClass = 'text-2xl md:text-3xl'
	const actionButtonTextClass = 'text-2xl md:text-3xl'
	const nextButtonTextClass = 'text-2xl md:text-3xl'
	const buttonBaseClass =
		'btn-interactive-base btn-solid-content inline-flex items-center justify-center rounded-md border shadow-sm transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-px hover:shadow-md active:translate-y-[2px] active:scale-[0.97] active:shadow-inner disabled:opacity-50 disabled:translate-y-0 disabled:scale-100 disabled:shadow-none'
	const nextButtonSectionClass = 'mt-2 md:mt-2.5 md:pt-2'
	const buttonColorClassByName: Record<ButtonColor, string> = {
		blue: 'btn-blue',
		green: 'btn-green',
		red: 'btn-red',
		gray: 'btn-gray'
	}

	function buttonClass(
		sizeClass: string,
		color: ButtonColor,
		textClass: string
	) {
		return `${sizeClass} ${textClass} ${buttonBaseClass} ${buttonColorClassByName[color]}`
	}

	function updateValue(nextValue: number | undefined) {
		value = nextValue
		onValueChange?.(nextValue)
	}

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
		updateValue(value === undefined ? -0 : value * -1)
	}

	function handleInput(i: string): void {
		const digit = parseInt(i, 10)
		if (isNaN(digit)) return

		if (digit === 0 && value === 0) return

		if (value && value.toString().length >= 4) {
			return
		}

		if (value === undefined) {
			updateValue(digit)
			return
		}

		if (Object.is(value, -0)) {
			updateValue(digit * -1)
			return
		}

		updateValue(parseInt(`${value}${i}`, 10))
	}

	function resetInput() {
		updateValue(undefined)
	}

	function removeLastDigit() {
		if (value === undefined) return

		if (Object.is(value, -0) || (value > 0 && value < 10)) {
			updateValue(undefined)
			return
		}
		const isNegative = value < 0

		const nextValue = parseInt(value.toString().slice(0, -1), 10)

		if (isNaN(nextValue)) {
			updateValue(isNegative ? -0 : undefined)
			return
		}

		updateValue(nextValue)
	}

	function completePuzzle() {
		if (disabled || disabledNext || value === undefined) return

		onCompletePuzzle()
	}

	function isSupportedKeyboardInput(key: string) {
		return (
			key === 'Backspace' ||
			key === 'Delete' ||
			key === 'Enter' ||
			key === '-' ||
			/^\d$/.test(key)
		)
	}

	function isEditableTarget(target: EventTarget | null) {
		if (!(target instanceof Element)) return false

		return !!target.closest(
			'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
		)
	}

	function isInteractiveTarget(target: EventTarget | null) {
		if (!(target instanceof Element)) return false

		return !!target.closest(
			'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
		)
	}

	function isTargetInsideNumpad(target: EventTarget | null) {
		return target instanceof Node && !!numpadRoot?.contains(target)
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

		if (isEditableTarget(event.target)) return
		if (
			!isTargetInsideNumpad(event.target) &&
			isInteractiveTarget(event.target)
		)
			return
		if (!isSupportedKeyboardInput(event.key)) return

		event.preventDefault()
		onKeyDown(event)
	}

	$effect(() => {
		if (disabled) return
		window.addEventListener('keydown', handleWindowKeyDown)
		return () => window.removeEventListener('keydown', handleWindowKeyDown)
	})
</script>

<div class={rootClass} bind:this={numpadRoot}>
	<fieldset
		{disabled}
		class="transition-opacity duration-200 disabled:opacity-50"
	>
		<legend class="sr-only">{sr_numpad()}</legend>
		<div class={digitGridShellClass}>
			<div class={digitGridClass}>
				{#each { length: 9 } as _, i}
					<button
						type="button"
						class={buttonClass(
							squareButtonSizeClass,
							'gray',
							digitButtonTextClass
						)}
						data-testid="numpad-{i + 1}"
						onclick={(e) => {
							e.preventDefault()
							onClick((i + 1).toString())
						}}
					>
						{i + 1}
					</button>
				{/each}
				<button
					type="button"
					class={buttonClass(
						squareButtonSizeClass,
						'blue',
						actionButtonTextClass
					)}
					data-testid="numpad-minus"
					aria-label={sr_numpad_minus()}
					onclick={(e) => {
						e.preventDefault()
						onClick('-')
					}}
				>
					<span aria-hidden="true">&minus;</span>
				</button>
				<button
					type="button"
					class={buttonClass(
						squareButtonSizeClass,
						'gray',
						digitButtonTextClass
					)}
					data-testid="numpad-0"
					onclick={(e) => {
						e.preventDefault()
						onClick('0')
					}}
				>
					0
				</button>
				<button
					type="button"
					class={buttonClass(
						squareButtonSizeClass,
						'red',
						actionButtonTextClass
					)}
					data-testid="numpad-delete"
					aria-label={button_delete()}
					onclick={(e) => {
						e.preventDefault()
						resetInput()
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mx-auto h-5 w-5 md:h-5.5 md:w-5.5"
						aria-hidden="true"
					>
						<path d="m22 3-7 9 7 9" />
						<path d="M15 21H7L1 12 7 3h8" />
						<path d="m11 9 4 6" />
						<path d="m15 9-4 6" />
					</svg>
				</button>
			</div>
		</div>
		<div class={actionStackClass}>
			<div class={nextButtonSectionClass}>
				<button
					type="button"
					class={buttonClass(
						wideButtonSizeClass,
						nextButtonColor,
						nextButtonTextClass
					)}
					data-testid="numpad-next"
					onclick={(e) => {
						e.preventDefault()
						completePuzzle()
					}}
					disabled={disabledNext}
				>
					{button_next()}
				</button>
			</div>
		</div>
	</fieldset>
</div>
