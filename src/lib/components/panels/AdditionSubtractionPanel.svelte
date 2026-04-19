<script lang="ts">
	import { untrack } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import {
		alert_invalid_range,
		heading_number_range,
		label_allow_negative,
		label_from,
		label_to
	} from '$lib/paraglide/messages.js'
	import { Operator, getOperatorLabel } from '$lib/constants/Operator'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'

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
>
	<div class="mb-1 flex flex-row place-items-center">
		<label class="mr-3 text-lg" for="partOneMin-{operator}"
			>{label_from()}</label
		>
		<select
			class="form-select rounded-md"
			id="partOneMin-{operator}"
			value={rangeMin}
			onchange={(e) =>
				onRangeChange([
					Number((e.currentTarget as HTMLSelectElement).value),
					rangeMax
				])}
		>
			{#each minNumbers as n (n)}
				<option value={n}>
					{n}
				</option>
			{/each}
		</select>
		<label for="partOneMax-{operator}" class="mx-3 text-lg">
			{label_to()}
		</label>
		<select
			class="form-select rounded-md"
			id="partOneMax-{operator}"
			value={rangeMax}
			onchange={(e) =>
				onRangeChange([
					rangeMin,
					Number((e.currentTarget as HTMLSelectElement).value)
				])}
		>
			{#each maxNumbers as n (n)}
				<option value={n}>
					{n}
				</option>
			{/each}
		</select>
	</div>
	{#if operator === Operator.Subtraction}
		<label class="mt-6 inline-flex items-center text-lg">
			<input
				type="checkbox"
				class="form-checkbox h-5 w-5 rounded text-sky-700"
				checked={allowNegativeAnswers}
				onchange={(e) =>
					onAllowNegativeAnswersChange(
						(e.currentTarget as HTMLInputElement).checked
					)}
			/>
			<span class="ml-2">{label_allow_negative()}</span>
		</label>
	{/if}
	{#if (operator === Operator.Addition && hasInvalidAdditionRange) || (operator === Operator.Subtraction && hasInvalidSubtractionRange)}
		<div transition:slide={AppSettings.transitionDuration} class="mt-6">
			<AlertComponent color="red">{alert_invalid_range()}</AlertComponent>
		</div>
	{/if}
</PanelComponent>
