<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'
	import AlertComponent from '../widgets/AlertComponent.svelte'
	import { Operator } from '../../models/constants/Operator'

	export let operator: Operator
	export let isAllOperators: boolean
	export let hasInvalidAdditionRange: boolean
	export let hasInvalidSubtractionRange: boolean
	export let rangeMin: number
	export let rangeMax: number
	export let allowNegativeAnswers: boolean

	const minNumbers =
		operator === Operator.Addition
			? [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90]
			: [-40, -30, -20, -10, -5, 1, 5, 10, 20, 30, 40]
	const lastMinNumber = minNumbers[minNumbers.length - 1]

	if (lastMinNumber === undefined)
		throw new Error(
			'Cannot build addition/subtraction ranges: minNumbers is empty'
		)

	const maxNumbers = [...minNumbers.slice(1), lastMinNumber + 10] // Samme som minNumbers, bortsett fra første og siste ledd
</script>

<PanelComponent
	heading="Tallområde"
	label={isAllOperators ? AppSettings.operatorLabels[operator] : undefined}
>
	<div class="mb-1 flex flex-row place-items-center">
		<label class="mr-3 text-lg" for="partOneMin-{operator}">Fra</label>
		<select
			class="select-base"
			id="partOneMin-{operator}"
			bind:value={rangeMin}
		>
			{#each minNumbers as n}
				<option value={n}>
					{n}
				</option>
			{/each}
		</select>
		<label for="partOneMax-{operator}" class="mx-3 text-lg"> til </label>
		<select
			class="select-base"
			id="partOneMax-{operator}"
			bind:value={rangeMax}
		>
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
				class="h-5 w-5 rounded text-blue-700"
				bind:checked={allowNegativeAnswers}
			/>
			<span class="ml-2">Tillat negative svar</span>
		</label>
	{/if}
	{#if (operator === Operator.Addition && hasInvalidAdditionRange) || (operator === Operator.Subtraction && hasInvalidSubtractionRange)}
		<div transition:slide={AppSettings.transitionDuration} class="mt-4">
			<AlertComponent color="red"
				>&#171;Fra&#187; må være mindre enn &#171;til&#187;.</AlertComponent
			>
		</div>
	{/if}
</PanelComponent>
