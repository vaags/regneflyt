<script lang="ts">
	import { untrack } from 'svelte'
	import { slide } from 'svelte/transition'
	import { AppSettings } from '$lib/constants/AppSettings'
	import * as m from '$lib/paraglide/messages.js'
	import { Operator, getOperatorLabel } from '$lib/constants/Operator'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'

	let {
		operator,
		isAllOperators,
		hasInvalidAdditionRange,
		hasInvalidSubtractionRange,
		rangeMin = $bindable(),
		rangeMax = $bindable(),
		allowNegativeAnswers = $bindable()
	}: {
		operator: Operator
		isAllOperators: boolean
		hasInvalidAdditionRange: boolean
		hasInvalidSubtractionRange: boolean
		rangeMin: number
		rangeMax: number
		allowNegativeAnswers: boolean
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
		const values = new Set<number>()

		if (min !== start) values.add(min)
		for (let n = start; n < max; n += step) values.add(n)
		for (const s of [-5, 1, 5]) {
			if (s > min && s < max) values.add(s)
		}

		return [...values].sort((a, b) => a - b)
	}
</script>

<PanelComponent
	heading={m.heading_number_range()}
	label={isAllOperators ? getOperatorLabel(operator) : undefined}
>
	<div class="mb-1 flex flex-row place-items-center">
		<label class="mr-3 text-lg" for="partOneMin-{operator}"
			>{m.label_from()}</label
		>
		<select class="rounded-md" id="partOneMin-{operator}" bind:value={rangeMin}>
			{#each minNumbers as n}
				<option value={n}>
					{n}
				</option>
			{/each}
		</select>
		<label for="partOneMax-{operator}" class="mx-3 text-lg">
			{m.label_to()}
		</label>
		<select class="rounded-md" id="partOneMax-{operator}" bind:value={rangeMax}>
			{#each maxNumbers as n}
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
				class="h-5 w-5 rounded text-sky-700"
				bind:checked={allowNegativeAnswers}
			/>
			<span class="ml-2">{m.label_allow_negative()}</span>
		</label>
	{/if}
	{#if (operator === Operator.Addition && hasInvalidAdditionRange) || (operator === Operator.Subtraction && hasInvalidSubtractionRange)}
		<div transition:slide={AppSettings.transitionDuration} class="mt-6">
			<AlertComponent color="red">{m.alert_invalid_range()}</AlertComponent>
		</div>
	{/if}
</PanelComponent>
