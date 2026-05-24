<script lang="ts">
	import { goto } from '$app/navigation'
	import { showDevTools, adaptiveSkills } from '$lib/stores'
	import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
	import { adaptiveTuningDescriptions } from '$lib/models/adaptiveTuningDescriptions'
	import type { AdaptiveSkillMap } from '$lib/models/AdaptiveProfile'
	import {
		Operator,
		OperatorExtended,
		operatorSigns
	} from '$lib/constants/Operator'
	import type {
		CorrectnessMode,
		SimulationStep
	} from '$lib/models/SimulationTypes'
	import { runSimulation } from '$lib/helpers/simulation/simulationRunner'
	import { getRandomUint32Seed } from '$lib/helpers/seedHelper'

	$effect(() => {
		if (!showDevTools.current) {
			void goto('/')
		}
	})

	// ─── Simulation controls ───────────────────────────────────────────
	let selectedOperator = $state<
		(typeof OperatorExtended)[keyof typeof OperatorExtended]
	>(OperatorExtended.All)
	let startingSkills = $state<AdaptiveSkillMap>([...adaptiveSkills.current])
	let responseSpeed = $state(3)
	let correctnessMode = $state<CorrectnessMode>('correct')
	let mixedAccuracy = $state(0.7)
	let stepCount = $state(20)
	let seed = $state(getRandomUint32Seed())

	// ─── Tuning overrides (deep clone, session-only) ───────────────────
	let tuning = $state(structuredClone(adaptiveTuning))

	function resetTuning() {
		tuning = structuredClone(adaptiveTuning)
	}

	/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- dynamic group access on known tuning structure */
	function getTuningGroup(groupKey: string): Record<string, number> {
		return (tuning as unknown as Record<string, Record<string, number>>)[
			groupKey
		] as Record<string, number>
	}

	function getDefaultTuningValue(groupKey: string, paramKey: string): number {
		return (
			(adaptiveTuning as unknown as Record<string, Record<string, number>>)[
				groupKey
			] as Record<string, number>
		)[paramKey] as number
	}
	/* eslint-enable @typescript-eslint/no-unsafe-type-assertion -- end tuning access */

	function resetSkills() {
		startingSkills = [...adaptiveSkills.current]
	}

	function randomizeSeed() {
		seed = getRandomUint32Seed()
	}

	// ─── Debounced simulation ──────────────────────────────────────────
	let steps = $state<SimulationStep[]>([])
	let debounceTimer: ReturnType<typeof setTimeout> | undefined

	$effect(() => {
		// Snapshot reactive state synchronously to subscribe to all changes
		const tuningSnapshot = $state.snapshot(tuning)
		const skillsSnapshot = $state.snapshot(startingSkills)
		const op = selectedOperator
		const speed = responseSpeed
		const mode = correctnessMode
		const accuracy = mixedAccuracy
		const count = stepCount
		const currentSeed = seed

		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			steps = runSimulation({
				tuning: tuningSnapshot,
				startingSkills: skillsSnapshot as AdaptiveSkillMap,
				operator: op,
				steps: count,
				responseSpeed: speed,
				correctnessMode: mode,
				mixedAccuracy: accuracy,
				seed: currentSeed
			})
		}, 200)

		return () => clearTimeout(debounceTimer)
	})

	// ─── Chart helpers ─────────────────────────────────────────────────
	const chartWidth = 600
	const chartHeight = 150
	const chartPadding = 20

	const operatorMeta: Record<Operator, { color: string; label: string }> = {
		[Operator.Addition]: { color: '#0284c7', label: '+ Addition' },
		[Operator.Subtraction]: { color: '#7c3aed', label: '− Subtraction' },
		[Operator.Multiplication]: { color: '#059669', label: '× Multiplication' },
		[Operator.Division]: { color: '#dc2626', label: '÷ Division' }
	}
	const operatorIds: Operator[] = [
		Operator.Addition,
		Operator.Subtraction,
		Operator.Multiplication,
		Operator.Division
	]

	function buildOperatorPaths(
		data: SimulationStep[]
	): { operator: Operator; path: string; color: string }[] {
		if (data.length === 0) return []
		const maxSkill = tuning.skillBounds.maxSkill
		const xStep = (chartWidth - 2 * chartPadding) / Math.max(data.length - 1, 1)

		const lastSkill: Record<Operator, number> = {
			[Operator.Addition]: -1,
			[Operator.Subtraction]: -1,
			[Operator.Multiplication]: -1,
			[Operator.Division]: -1
		}
		for (const op of operatorIds) {
			const first = data.find((s) => s.operator === op)
			if (first) lastSkill[op] = first.skillBefore
		}

		const pointsByOp: Record<Operator, string[]> = {
			[Operator.Addition]: [],
			[Operator.Subtraction]: [],
			[Operator.Multiplication]: [],
			[Operator.Division]: []
		}

		for (let i = 0; i < data.length; i++) {
			const step = data[i]
			if (!step) continue
			lastSkill[step.operator] = step.skillAfter

			const x = chartPadding + i * xStep
			for (const op of operatorIds) {
				if (lastSkill[op] < 0) continue
				const y =
					chartHeight -
					chartPadding -
					(lastSkill[op] / maxSkill) * (chartHeight - 2 * chartPadding)
				pointsByOp[op].push(`${x},${y}`)
			}
		}

		return operatorIds
			.filter((op) => pointsByOp[op].length > 0)
			.map((op) => ({
				operator: op,
				path: `M${pointsByOp[op].join(' L')}`,
				color: operatorMeta[op].color
			}))
	}

	let chartLines = $derived(buildOperatorPaths(steps))

	function formatPuzzleExpression(step: SimulationStep): string {
		const [left, right, result] = step.puzzle.parts
		const sign = operatorSigns[step.operator]
		const unknownIndex = step.puzzle.unknownPartIndex
		const display = [
			String(left.generatedValue),
			String(right.generatedValue),
			String(result.generatedValue)
		]
		display[unknownIndex] = '?'
		return `${display[0]} ${sign} ${display[1]} = ${display[2]}`
	}

	// ─── Tuning param metadata for sliders ─────────────────────────────
	type TuningGroup = keyof typeof adaptiveTuning
	type ParamMeta = { key: string; min: number; max: number; step: number }

	const tuningMeta = {
		skillBounds: [
			{ key: 'minSkill', min: 0, max: 50, step: 1 },
			{ key: 'maxSkill', min: 50, max: 100, step: 1 }
		],
		operatorMixing: [
			{ key: 'operatorWeightBase', min: 100, max: 200, step: 1 },
			{ key: 'skillGapDampingFactor', min: 0, max: 1, step: 0.05 },
			{ key: 'weakOperatorMinDifficultyBoost', min: 0, max: 30, step: 1 },
			{ key: 'weakOperatorGapThreshold', min: 1, max: 50, step: 1 }
		],
		timing: [
			{ key: 'maxDurationSeconds', min: 1, max: 30, step: 1 },
			{ key: 'maxDurationAtMaxSkill', min: 1, max: 30, step: 1 }
		],
		penalties: [
			{ key: 'basePenalty', min: 0.5, max: 10, step: 0.5 },
			{ key: 'slownessPenaltyBonus', min: 0, max: 10, step: 0.5 },
			{ key: 'lowSkillPenaltyCapThreshold', min: 1, max: 50, step: 1 },
			{ key: 'lowSkillPenaltyCapFraction', min: 0.1, max: 1, step: 0.05 },
			{ key: 'cooldownSteps', min: 0, max: 5, step: 1 },
			{ key: 'cooldownRangeReduction', min: 0, max: 0.5, step: 0.05 }
		],
		gains: [
			{ key: 'baseSkillGain', min: 0.1, max: 5, step: 0.1 },
			{ key: 'confidenceEffect', min: 0, max: 1, step: 0.05 }
		],
		streak: [
			{ key: 'streakBoostThreshold', min: 1, max: 20, step: 1 },
			{ key: 'streakBoostMultiplier', min: 1, max: 3, step: 0.05 },
			{ key: 'streakBoostMaxSpeedFraction', min: 0.1, max: 1, step: 0.05 }
		],
		calibration: [
			{ key: 'calibrationThreshold', min: 1, max: 80, step: 1 },
			{ key: 'calibrationMaxBoost', min: 1, max: 2, step: 0.05 },
			{ key: 'taperThreshold', min: 20, max: 99, step: 1 },
			{ key: 'taperMinGain', min: 0.05, max: 1, step: 0.05 }
		],
		additionSubtraction: [
			{ key: 'rangeBase', min: 1, max: 20, step: 1 },
			{ key: 'rangeScale', min: 10, max: 200, step: 5 },
			{ key: 'addSubExponent', min: 0.5, max: 4, step: 0.1 },
			{ key: 'lowerBoundScale', min: 0, max: 0.9, step: 0.05 },
			{ key: 'secondOperandSkillLag', min: 0, max: 50, step: 1 },
			{ key: 'carryBorrowSkillThreshold', min: 0, max: 100, step: 5 }
		],
		thresholds: [
			{ key: 'minDifficultyRatio', min: 0, max: 1, step: 0.05 },
			{ key: 'difficultyWindowOvershoot', min: 0, max: 50, step: 1 },
			{ key: 'minWindowSize', min: 5, max: 60, step: 1 }
		],
		multiplicationDivision: [
			{ key: 'tablesBase', min: 1, max: 5, step: 1 },
			{ key: 'tablesScale', min: 1, max: 20, step: 1 },
			{ key: 'tablesExponent', min: 0.1, max: 2, step: 0.1 },
			{ key: 'tablesDropScale', min: 0, max: 0.9, step: 0.05 },
			{ key: 'factorMin', min: 1, max: 5, step: 1 },
			{ key: 'factorMax', min: 5, max: 15, step: 1 },
			{ key: 'factorMinAtMaxSkill', min: 1, max: 10, step: 1 },
			{ key: 'factorMaxAtMinSkill', min: 2, max: 12, step: 1 }
		],
		puzzleMode: [
			{ key: 'alternateMidpoint', min: 0, max: 100, step: 5 },
			{ key: 'randomMidpoint', min: 0, max: 100, step: 5 },
			{ key: 'transitionSpread', min: 1, max: 30, step: 1 }
		],
		algebraicRollout: [
			{ key: 'algebraicSkillOffset', min: 0, max: 50, step: 1 },
			{ key: 'negativeSubStartSkill', min: 0, max: 100, step: 5 },
			{ key: 'negativeSubFullSkill', min: 0, max: 100, step: 5 },
			{ key: 'divisorUnknownStartSkill', min: 0, max: 100, step: 5 },
			{ key: 'divisorUnknownFullSkill', min: 0, max: 100, step: 5 },
			{ key: 'divisorUnknownProbability', min: 0, max: 1, step: 0.05 }
		],
		difficultyScoring: [
			{ key: 'minorOperandWeight', min: 0, max: 0.5, step: 0.05 },
			{ key: 'carryBorrowBoost', min: 0, max: 0.5, step: 0.05 },
			{ key: 'noCarryDiscount', min: 0, max: 0.5, step: 0.05 },
			{ key: 'maxTableDifficultyScore', min: 20, max: 100, step: 1 },
			{ key: 'addSubBase', min: 0, max: 10, step: 0.5 },
			{ key: 'addScale', min: 10, max: 150, step: 5 },
			{ key: 'subScale', min: 10, max: 150, step: 5 },
			{ key: 'factorWeight', min: 0, max: 1, step: 0.05 },
			{ key: 'identityFactorMultiplier', min: 0.1, max: 1, step: 0.05 },
			{ key: 'mulDivExponent', min: 0.1, max: 2, step: 0.05 }
		],
		remediation: [
			{ key: 'thresholdAccuracy', min: 0, max: 1, step: 0.05 },
			{ key: 'minPuzzles', min: 1, max: 10, step: 1 },
			{ key: 'slowResponseSeconds', min: 0.5, max: 5, step: 0.5 },
			{ key: 'fastLowAccuracyMinPuzzles', min: 1, max: 15, step: 1 }
		]
	} satisfies Record<TuningGroup, ParamMeta[]>
</script>

{#if showDevTools.current}
	<div class="py-6">
		<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
			Adaptive Simulation
		</h1>
		<p class="mt-1 text-sm text-stone-600 dark:text-stone-400">
			Adaptive mode only. Adjust parameters and simulate answer trajectories
			with isolated state.
		</p>

		<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
			<!-- Left column: Controls -->
			<div class="space-y-4">
				<!-- Simulation settings -->
				<section>
					<h2 class="text-lg font-semibold text-stone-800 dark:text-stone-200">
						Simulation
					</h2>
					<div class="mt-2 space-y-3">
						<label class="block">
							<span class="text-sm text-stone-700 dark:text-stone-300"
								>Operator</span
							>
							<select
								bind:value={selectedOperator}
								class="mt-1 block w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
							>
								<option value={OperatorExtended.All}>All</option>
								<option value={OperatorExtended.Addition}>+ Addition</option>
								<option value={OperatorExtended.Subtraction}
									>− Subtraction</option
								>
								<option value={OperatorExtended.Multiplication}
									>× Multiplication</option
								>
								<option value={OperatorExtended.Division}>÷ Division</option>
							</select>
						</label>
						<label class="block">
							<span class="text-sm text-stone-700 dark:text-stone-300"
								>Steps: {stepCount}</span
							>
							<input
								type="range"
								bind:value={stepCount}
								min="5"
								max="500"
								step="5"
								class="mt-1 w-full"
							/>
						</label>
						<label class="block">
							<span class="text-sm text-stone-700 dark:text-stone-300"
								>Response speed: {responseSpeed}s</span
							>
							<input
								type="range"
								bind:value={responseSpeed}
								min="0.5"
								max="15"
								step="0.5"
								class="mt-1 w-full"
							/>
						</label>
						<fieldset>
							<legend class="text-sm text-stone-700 dark:text-stone-300"
								>Correctness</legend
							>
							<div class="mt-1 flex gap-3">
								<label class="flex items-center gap-1 text-sm">
									<input
										type="radio"
										bind:group={correctnessMode}
										value="correct"
									/>
									All correct
								</label>
								<label class="flex items-center gap-1 text-sm">
									<input
										type="radio"
										bind:group={correctnessMode}
										value="incorrect"
									/>
									All incorrect
								</label>
								<label class="flex items-center gap-1 text-sm">
									<input
										type="radio"
										bind:group={correctnessMode}
										value="mixed"
									/>
									Mixed
								</label>
							</div>
						</fieldset>
						{#if correctnessMode === 'mixed'}
							<label class="block">
								<span class="text-sm text-stone-700 dark:text-stone-300"
									>Accuracy: {Math.round(mixedAccuracy * 100)}%</span
								>
								<input
									type="range"
									bind:value={mixedAccuracy}
									min="0"
									max="1"
									step="0.05"
									class="mt-1 w-full"
								/>
							</label>
						{/if}
						<label class="block">
							<span class="text-sm text-stone-700 dark:text-stone-300"
								>Seed</span
							>
							<div class="mt-1 flex gap-2">
								<input
									type="number"
									bind:value={seed}
									class="w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
								/>
								<button
									type="button"
									onclick={randomizeSeed}
									class="rounded bg-stone-200 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
								>
									Random
								</button>
							</div>
						</label>
					</div>
				</section>

				<!-- Starting skills -->
				<section>
					<div class="flex items-center justify-between">
						<h2
							class="text-lg font-semibold text-stone-800 dark:text-stone-200"
						>
							Starting skills
						</h2>
						<button
							type="button"
							onclick={resetSkills}
							class="text-xs text-sky-600 hover:underline dark:text-sky-400"
						>
							Reset from store
						</button>
					</div>
					<div class="mt-2 space-y-2">
						{#each ['+', '−', '×', '÷'] as sign, i (sign)}
							<label class="flex items-center gap-2 text-sm">
								<span
									class="w-4 text-center font-mono text-stone-600 dark:text-stone-400"
									>{sign}</span
								>
								<input
									type="range"
									bind:value={startingSkills[i]}
									min="0"
									max="100"
									step="1"
									class="flex-1"
								/>
								<span
									class="w-8 text-right text-xs text-stone-600 dark:text-stone-400"
									>{startingSkills[i]}</span
								>
							</label>
						{/each}
					</div>
				</section>

				<!-- Tuning parameters -->
				<section>
					<div class="flex items-center justify-between">
						<h2
							class="text-lg font-semibold text-stone-800 dark:text-stone-200"
						>
							Tuning parameters
						</h2>
						<button
							type="button"
							onclick={resetTuning}
							class="text-xs text-sky-600 hover:underline dark:text-sky-400"
						>
							Reset all
						</button>
					</div>
					<div class="mt-2 space-y-1">
						{#each Object.entries(tuningMeta) as [groupKey, params] (groupKey)}
							{@const isDisabledGroup =
								groupKey === 'operatorMixing' &&
								selectedOperator !== OperatorExtended.All}
							{@const needsUnequalSkills =
								groupKey === 'operatorMixing' &&
								selectedOperator === OperatorExtended.All &&
								startingSkills.every((s) => s === startingSkills[0])}
							<details
								class="rounded border border-stone-200 dark:border-stone-700"
							>
								<summary
									class="cursor-pointer px-2 py-1 text-sm font-medium text-stone-700 dark:text-stone-300"
								>
									{groupKey}
									{#if isDisabledGroup}
										<span
											class="ml-1 text-xs font-normal text-stone-400 dark:text-stone-500"
										>
											(only applies when operator is All)
										</span>
									{:else if needsUnequalSkills}
										<span
											class="ml-1 text-xs font-normal text-stone-400 dark:text-stone-500"
										>
											(set unequal starting skills to see effect)
										</span>
									{/if}
								</summary>
								<div
									class="space-y-2 px-2 pt-1 pb-2"
									class:opacity-40={isDisabledGroup}
								>
									{#each params as meta (meta.key)}
										{@const group = getTuningGroup(groupKey)}
										{@const desc = (
											adaptiveTuningDescriptions as Record<
												string,
												Record<string, string>
											>
										)[groupKey]?.[meta.key]}
										{@const defaultValue = getDefaultTuningValue(
											groupKey,
											meta.key
										)}
										{@const isModified = group[meta.key] !== defaultValue}
										<label class="block">
											<span
												class="flex items-baseline gap-1 text-sm text-stone-700 dark:text-stone-300"
											>
												<span class="flex-1"
													>{meta.key}: {group[meta.key]}{#if isModified}
														<span
															class="ml-1 text-xs text-stone-400 dark:text-stone-500"
															>(default: {defaultValue})</span
														>{/if}</span
												>
												{#if isModified}
													<button
														type="button"
														onclick={() => {
															getTuningGroup(groupKey)[meta.key] = defaultValue
														}}
														class="text-xs text-sky-600 hover:underline dark:text-sky-400"
													>
														Reset
													</button>
												{/if}
											</span>
											{#if desc}
												<small
													class="block text-xs leading-tight text-stone-600 dark:text-stone-400"
												>
													{desc}
												</small>
											{/if}
											<input
												type="range"
												value={group[meta.key]}
												oninput={(e) => {
													const target = e.currentTarget as HTMLInputElement
													getTuningGroup(groupKey)[meta.key] = parseFloat(
														target.value
													)
												}}
												min={meta.min}
												max={meta.max}
												step={meta.step}
												class="w-full"
											/>
										</label>
									{/each}
								</div>
							</details>
						{/each}
					</div>
				</section>
			</div>

			<!-- Right column: Results -->
			<div class="space-y-4">
				<!-- Skill trajectory chart -->
				{#if steps.length > 0}
					<section>
						<h2
							class="text-lg font-semibold text-stone-800 dark:text-stone-200"
						>
							Skill trajectory
						</h2>
						<svg
							viewBox="0 0 {chartWidth} {chartHeight}"
							role="img"
							aria-label="Skill trajectory chart showing skill levels over simulation steps"
							class="mt-2 w-full rounded border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
						>
							<!-- Grid lines -->
							{#each [0, 0.25, 0.5, 0.75, 1].map( (f) => Math.round(f * tuning.skillBounds.maxSkill) ) as level (level)}
								{@const y =
									chartHeight -
									chartPadding -
									(level / tuning.skillBounds.maxSkill) *
										(chartHeight - 2 * chartPadding)}
								<line
									x1={chartPadding}
									y1={y}
									x2={chartWidth - chartPadding}
									y2={y}
									stroke="currentColor"
									stroke-opacity="0.1"
								/>
								<text
									x={chartPadding - 4}
									y={y + 3}
									text-anchor="end"
									class="fill-stone-400 text-xs"
								>
									{level}
								</text>
							{/each}
							<!-- Trajectory lines (one per operator) -->
							{#each chartLines as line (line.operator)}
								<path
									d={line.path}
									fill="none"
									stroke={line.color}
									stroke-width="2"
								/>
							{/each}
						</svg>
						<!-- Legend -->
						<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
							{#each chartLines as line (line.operator)}
								<span
									class="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400"
								>
									<span
										class="inline-block h-0.5 w-4 rounded"
										class:bg-sky-600={line.operator === Operator.Addition}
										class:bg-violet-600={line.operator === Operator.Subtraction}
										class:bg-emerald-600={line.operator ===
											Operator.Multiplication}
										class:bg-red-600={line.operator === Operator.Division}
									></span>
									{operatorMeta[line.operator].label}
								</span>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Results table -->
				<section>
					<h2 class="text-lg font-semibold text-stone-800 dark:text-stone-200">
						Steps ({steps.length})
					</h2>
					<div
						class="mt-2 max-h-[60vh] overflow-auto rounded border border-stone-200 dark:border-stone-700"
					>
						<table class="w-full text-left text-xs">
							<thead class="sticky top-0 bg-stone-100 dark:bg-stone-800">
								<tr>
									<th class="px-2 py-1">#</th>
									<th class="px-2 py-1">Op</th>
									<th class="px-2 py-1">Expression</th>
									<th class="px-2 py-1">Diff</th>
									<th class="px-2 py-1">Result</th>
									<th class="px-2 py-1">Time</th>
									<th class="px-2 py-1">Skill</th>
									<th class="px-2 py-1">+</th>
									<th class="px-2 py-1">&minus;</th>
									<th class="px-2 py-1">&times;</th>
									<th class="px-2 py-1">&divide;</th>
								</tr>
							</thead>
							<tbody>
								{#each steps as step, i (i)}
									<tr
										class={step.isCorrect
											? 'bg-green-50 dark:bg-green-950/30'
											: 'bg-red-50 dark:bg-red-950/30'}
									>
										<td class="px-2 py-0.5 text-stone-500">{i + 1}</td>
										<td class="px-2 py-0.5 font-mono"
											>{operatorSigns[step.operator]}</td
										>
										<td class="px-2 py-0.5 font-mono"
											>{formatPuzzleExpression(step)}</td
										>
										<td class="px-2 py-0.5">{step.difficulty.toFixed(0)}</td>
										<td class="px-2 py-0.5">
											{#if step.isCorrect}
												<span class="text-green-700 dark:text-green-400">✓</span
												>
											{:else}
												<span class="text-red-700 dark:text-red-400">✗</span>
											{/if}
										</td>
										<td class="px-2 py-0.5">{step.durationSeconds}s</td>
										<td class="px-2 py-0.5">
											{step.skillBefore.toFixed(1)} → {step.skillAfter.toFixed(
												1
											)}
											<span
												class={step.skillAfter > step.skillBefore
													? 'text-green-600 dark:text-green-400'
													: step.skillAfter < step.skillBefore
														? 'text-red-600 dark:text-red-400'
														: 'text-stone-400'}
											>
												({step.skillAfter > step.skillBefore ? '+' : ''}{(
													step.skillAfter - step.skillBefore
												).toFixed(1)})
											</span>
										</td>
										{#each step.allSkills as skill, opIdx (opIdx)}
											<td
												class="px-2 py-0.5 tabular-nums {opIdx === step.operator
													? 'font-semibold'
													: 'text-stone-400 dark:text-stone-500'}"
											>
												{skill.toFixed(1)}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}
