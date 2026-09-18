<script lang="ts">
	import type { ButtonColor } from './ButtonTypes'
	import {
		button_delete,
		button_next,
		sr_numpad,
		sr_numpad_minus
	} from '#lib/paraglide/messages.js'
	import { hapticTap } from '#lib/helpers/hapticHelper.ts'

	type NumpadNextButtonColor = Exclude<ButtonColor, 'blue'>

	let {
		value = $bindable(undefined),
		disabled = false,
		disabledNext = false,
		nextButtonColor = 'gray',
		ariaDescribedBy = undefined,
		onValueChange = undefined,
		onCompletePuzzle = () => {}
	}: {
		value?: number | undefined
		disabled?: boolean
		disabledNext?: boolean
		nextButtonColor?: NumpadNextButtonColor
		ariaDescribedBy?: string | undefined
		onValueChange?: ((value: number | undefined) => void) | undefined
		onCompletePuzzle?: (completedByKeyboard?: boolean) => void
	} = $props()

	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

	function updateValue(nextValue: number | undefined) {
		value = nextValue
		onValueChange?.(nextValue)
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

	function resetInput() {
		updateValue(undefined)
	}

	function handleInput(i: string): void {
		const digit = parseInt(i, 10)
		if (isNaN(digit)) return

		if (digit === 0 && value === 0) return

		if (value && Math.abs(value).toString().length >= 4) {
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

	function completePuzzle(completedByKeyboard = false) {
		if (disabled || disabledNext) return

		onCompletePuzzle(completedByKeyboard)
	}

	let keyboardNextActivationPending = false
</script>

<div class="numpad">
	<fieldset
		{disabled}
		aria-describedby={ariaDescribedBy}
		class="numpad__fieldset"
	>
		<legend class="visually-hidden">{sr_numpad()}</legend>
		<div class="numpad__shell">
			<div class="numpad__grid">
				{#each digits as digit (digit)}
					<button
						type="button"
						class="numpad__key focus-indicator"
						data-color="gray"
						data-testid="numpad-{digit}"
						onclick={(e) => {
							e.preventDefault()
							onClick(digit.toString())
						}}
					>
						{digit}
					</button>
				{/each}
				<button
					type="button"
					class="numpad__key focus-indicator"
					data-color="blue"
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
					class="numpad__key focus-indicator"
					data-color="gray"
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
					class="numpad__key focus-indicator"
					data-color="red"
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
						class="numpad__delete-icon"
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
		<div class="numpad__shell">
			<div class="numpad__next-section">
				<button
					type="button"
					class="numpad__next focus-indicator"
					data-color={nextButtonColor}
					data-testid="numpad-next"
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							keyboardNextActivationPending = true
						}
					}}
					onclick={(e) => {
						e.preventDefault()
						completePuzzle(keyboardNextActivationPending)
						keyboardNextActivationPending = false
					}}
					disabled={disabledNext}
				>
					{button_next()}
				</button>
			</div>
		</div>
	</fieldset>
</div>

<style>
	.numpad {
		inline-size: 100%;
		touch-action: none;
	}

	.numpad__fieldset {
		transition: opacity 200ms;
	}

	.numpad__fieldset:disabled {
		opacity: 0.5;
	}

	.numpad__shell {
		inline-size: 100%;
		max-inline-size: 13rem;
		margin-inline: auto;
	}

	.numpad__grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.3125rem;
		margin-block-end: 0.375rem;
		text-align: center;
	}

	.numpad__key,
	.numpad__next {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 100%;
		min-inline-size: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		color: white;
		font-size: 1.5rem;
		line-height: 1;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
		transition:
			transform 150ms ease-out,
			box-shadow 150ms ease-out,
			filter 150ms ease-out;
	}

	.numpad__key {
		aspect-ratio: 1.06 / 1;
	}

	.numpad__next {
		padding: 0.625rem 0.75rem;
	}

	.numpad__key:hover,
	.numpad__next:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgb(0 0 0 / 0.12);
	}

	.numpad__key:active,
	.numpad__next:active {
		transform: translateY(2px) scale(0.97);
		box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.12);
	}

	.numpad__key:disabled,
	.numpad__next:disabled {
		transform: none;
		box-shadow: none;
		opacity: 0.5;
	}

	.numpad__key[data-color='blue'],
	.numpad__next[data-color='blue'] {
		border-color: var(--color-primary-950);
		background: var(--color-primary-900);
	}

	.numpad__next[data-color='green'] {
		border-color: var(--color-positive-900);
		background: var(--color-positive-800);
	}

	.numpad__key[data-color='red'],
	.numpad__next[data-color='red'] {
		border-color: var(--color-danger-900);
		background: var(--color-danger-800);
	}

	.numpad__key[data-color='gray'],
	.numpad__next[data-color='gray'] {
		border-color: var(--color-neutral-700);
		background: var(--color-neutral-600);
	}

	.numpad__delete-icon {
		inline-size: 1.5rem;
		block-size: 1.5rem;
		margin-inline: auto;
	}

	.numpad__next-section {
		margin-block-start: 3px;
	}

	@media (min-width: 48rem) {
		.numpad__shell {
			max-inline-size: 13.5rem;
		}

		.numpad__grid {
			gap: 0.5rem;
			margin-block-end: 0.5rem;
		}

		.numpad__key,
		.numpad__next {
			font-size: 1.875rem;
		}

		.numpad__next {
			padding: 0.75rem 1rem;
		}

		.numpad__next-section {
			margin-block-start: 0.625rem;
			padding-block-start: 0.5rem;
		}

		.numpad__delete-icon {
			inline-size: 1.75rem;
			block-size: 1.75rem;
		}
	}
</style>
