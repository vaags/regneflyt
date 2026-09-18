<script lang="ts">
	import { untrack } from 'svelte'
	import { AppSettings } from '#lib/constants/AppSettings.ts'
	import {
		alert_invalid_range,
		heading_number_range,
		label_allow_negative,
		label_from,
		label_to
	} from '#lib/paraglide/messages.js'
	import { Operator } from '#lib/domain/arithmetic/operator.ts'
	import { getOperatorLabel } from '#lib/integrations/paraglide/operatorLabels.ts'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import ValidationMessageComponent from '../widgets/ValidationMessageComponent.svelte'

	let {
		operator,
		isAllOperators,
		hasInvalidAdditionRange,
		hasInvalidSubtractionRange,
		rangeMin,
		rangeMax,
		allowNegativeAnswers,
		onRangeChange,
		onAllowNegativeAnswersChange
	}: {
		operator: Operator
		isAllOperators: boolean
		hasInvalidAdditionRange: boolean
		hasInvalidSubtractionRange: boolean
		rangeMin: number
		rangeMax: number
		allowNegativeAnswers: boolean
		onRangeChange: (range: [min: number, max: number]) => void
		onAllowNegativeAnswersChange: (allowNegativeAnswers: boolean) => void
	} = $props()

	const {
		additionMinRange,
		additionMaxRange,
		subtractionMinRange,
		subtractionMaxRange
	} = AppSettings

	const minNumbers =
		untrack(() => operator) === Operator.Addition
			? buildSteps(additionMinRange, additionMaxRange)
			: buildSteps(subtractionMinRange, subtractionMaxRange)
	const lastMinNumber = minNumbers[minNumbers.length - 1]

	if (lastMinNumber === undefined)
		throw new Error(
			'Cannot build addition/subtraction ranges: minNumbers is empty'
		)

	const maxNumbers = [...minNumbers.slice(1), lastMinNumber + 10]

	let errorId = $derived(`number-range-error-${operator}`)
	let hasInvalidRange = $derived(
		(operator === Operator.Addition && hasInvalidAdditionRange) ||
			(operator === Operator.Subtraction && hasInvalidSubtractionRange)
	)

	function buildSteps(min: number, max: number): number[] {
		const step = 10
		const start = Math.ceil(min / step) * step
		const values: number[] = []
		const seen: Record<number, true> = {}

		const pushUnique = (value: number) => {
			if (seen[value]) return
			seen[value] = true
			values.push(value)
		}

		if (min !== start) pushUnique(min)
		for (let n = start; n < max; n += step) pushUnique(n)
		for (const s of [-5, 1, 5]) {
			if (s > min && s < max) pushUnique(s)
		}

		return values.sort((a, b) => a - b)
	}
</script>

<PanelComponent
	heading={heading_number_range()}
	label={isAllOperators ? getOperatorLabel(operator) : undefined}
	stateKey="number-range-{operator}"
>
	<div class="range-row">
		<label class="range-row__label" for="partOneMin-{operator}"
			>{label_from()}</label
		>
		<select
			id="partOneMin-{operator}"
			value={rangeMin}
			aria-invalid={hasInvalidRange ? 'true' : undefined}
			aria-describedby={hasInvalidRange ? errorId : undefined}
			onchange={(e) => onRangeChange([Number(e.currentTarget.value), rangeMax])}
		>
			{#each minNumbers as n (n)}
				<option value={n}>
					{n}
				</option>
			{/each}
		</select>
		<label
			for="partOneMax-{operator}"
			class="range-row__label range-row__label--middle"
		>
			{label_to()}
		</label>
		<select
			id="partOneMax-{operator}"
			value={rangeMax}
			aria-invalid={hasInvalidRange ? 'true' : undefined}
			aria-describedby={hasInvalidRange ? errorId : undefined}
			onchange={(e) => onRangeChange([rangeMin, Number(e.currentTarget.value)])}
		>
			{#each maxNumbers as n (n)}
				<option value={n}>
					{n}
				</option>
			{/each}
		</select>
	</div>
	{#if operator === Operator.Subtraction}
		<label class="negative-option">
			<input
				type="checkbox"
				checked={allowNegativeAnswers}
				onchange={(e) => onAllowNegativeAnswersChange(e.currentTarget.checked)}
			/>
			<span>{label_allow_negative()}</span>
		</label>
	{/if}
	<ValidationMessageComponent
		id={errorId}
		testId={errorId}
		show={hasInvalidRange}
		message={alert_invalid_range()}
	/>
</PanelComponent>

<style>
	.range-row {
		display: flex;
		align-items: center;
		margin-block-end: 0.25rem;
	}

	.range-row__label {
		margin-inline-end: 0.75rem;
		font-size: 1.125rem;
	}

	.range-row__label--middle {
		margin-inline: 0.75rem;
	}

	.negative-option {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--target-minimum);
		gap: 0.5rem;
		margin-block-start: 1.5rem;
		padding-block: 0.25rem;
		font-size: 1.125rem;
	}
</style>
