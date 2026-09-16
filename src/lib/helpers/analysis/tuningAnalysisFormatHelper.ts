import type {
	ComparisonArtifact,
	StandaloneArtifact,
	TuningAnalysisArtifact
} from './tuningAnalysisTypes.ts'

type Artifact = TuningAnalysisArtifact
type AnalysisSummary = StandaloneArtifact['summary']
type DedicatedSummary = AnalysisSummary['dedicated'][number]
type AllModeSummary = NonNullable<AnalysisSummary['allOperator']>
type AnalysisDelta = ComparisonArtifact['summary']['delta']
type DedicatedDelta = AnalysisDelta['dedicated'][number]
type AllModeDelta = NonNullable<AnalysisDelta['allOperator']>
type StepMetrics = Pick<
	DedicatedSummary,
	| 'meanCorrectGain'
	| 'meanIncorrectPenalty'
	| 'netSkillChangePerPuzzle'
	| 'meanDifficulty'
	| 'meanDifficultyRatio'
	| 'blockedGainRate'
	| 'ceilingClampedGainRate'
	| 'floorClampedPenaltyRate'
	| 'totalCooldownPuzzles'
	| 'meanCooldownDifficulty'
>
type CompositionSummary = DedicatedSummary['composition']
type CompositionDelta = DedicatedDelta['composition']

function number(value: number): string {
	return value.toFixed(2)
}

function percent(value: number | null): string {
	return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`
}

function comparisonRow(
	label: string,
	baseline: number,
	candidate: number,
	delta: number,
	format: (value: number) => string = number
): string {
	return `${label.padEnd(22)} ${format(baseline).padStart(10)} ${format(candidate).padStart(10)} ${format(delta).padStart(10)}`
}

function primaryComparisonLines(
	baseline: StepMetrics,
	candidate: StepMetrics,
	delta: StepMetrics,
	finalSkill?: { baseline: number; candidate: number; delta: number }
): string[] {
	return [
		' '.repeat(22) + '   Baseline  Candidate      Delta',
		...(finalSkill === undefined
			? []
			: [
					comparisonRow(
						'Final skill',
						finalSkill.baseline,
						finalSkill.candidate,
						finalSkill.delta
					)
				]),
		comparisonRow(
			'Correct gain',
			baseline.meanCorrectGain,
			candidate.meanCorrectGain,
			delta.meanCorrectGain
		),
		comparisonRow(
			'Incorrect penalty',
			baseline.meanIncorrectPenalty,
			candidate.meanIncorrectPenalty,
			delta.meanIncorrectPenalty
		),
		comparisonRow(
			'Net change/puzzle',
			baseline.netSkillChangePerPuzzle,
			candidate.netSkillChangePerPuzzle,
			delta.netSkillChangePerPuzzle
		),
		comparisonRow(
			'Difficulty',
			baseline.meanDifficulty,
			candidate.meanDifficulty,
			delta.meanDifficulty
		),
		comparisonRow(
			'Difficulty ratio',
			baseline.meanDifficultyRatio,
			candidate.meanDifficultyRatio,
			delta.meanDifficultyRatio
		),
		comparisonRow(
			'Blocked gain rate',
			baseline.blockedGainRate,
			candidate.blockedGainRate,
			delta.blockedGainRate,
			percent
		),
		comparisonRow(
			'Ceiling-clamped rate',
			baseline.ceilingClampedGainRate,
			candidate.ceilingClampedGainRate,
			delta.ceilingClampedGainRate,
			percent
		),
		comparisonRow(
			'Floor-clamped rate',
			baseline.floorClampedPenaltyRate,
			candidate.floorClampedPenaltyRate,
			delta.floorClampedPenaltyRate,
			percent
		),
		comparisonRow(
			'Cooldown puzzles',
			baseline.totalCooldownPuzzles,
			candidate.totalCooldownPuzzles,
			delta.totalCooldownPuzzles,
			(value) => value.toFixed(0)
		),
		comparisonRow(
			'Cooldown difficulty',
			baseline.meanCooldownDifficulty,
			candidate.meanCooldownDifficulty,
			delta.meanCooldownDifficulty
		)
	]
}

function inputLine(artifact: Artifact): string {
	return artifact.mode === 'standalone'
		? `Input: ${artifact.inputs.tuning ?? 'repository tuning'}`
		: `Inputs: baseline=${artifact.inputs.baseline ?? 'unknown'}, candidate=${artifact.inputs.candidate ?? 'unknown'}`
}

function tuningChangeLines(artifact: ComparisonArtifact): string[] {
	return [
		`Tuning changes: ${artifact.tuningChanges.length}`,
		...artifact.tuningChanges.map(
			(change) =>
				`  ${change.path}: ${JSON.stringify(change.baseline)} → ${JSON.stringify(change.candidate)}`
		)
	]
}

function stepLine(label: string, value: StepMetrics): string {
	return `${label.padEnd(14)} gain=${value.meanCorrectGain.toFixed(2)} penalty=${value.meanIncorrectPenalty.toFixed(2)} net=${value.netSkillChangePerPuzzle.toFixed(2)} difficulty=${value.meanDifficulty.toFixed(2)} ratio=${value.meanDifficultyRatio.toFixed(2)} blocked=${percent(value.blockedGainRate)} ceiling-clamped=${percent(value.ceilingClampedGainRate)} floor-clamped=${percent(value.floorClampedPenaltyRate)} cooldown-puzzles=${value.totalCooldownPuzzles.toFixed(0)} cooldown-difficulty=${value.meanCooldownDifficulty.toFixed(2)}`
}

function compositionDeltaLines(value: CompositionDelta): string[] {
	return [
		`modes normal=${percent(value.normalMode)} alternate=${percent(value.alternateMode)} random=${percent(value.randomMode)}`,
		`forms unknown-operand=${percent(value.unknownOperand)} negative-sub=${percent(value.negativeSubtraction)} unknown-divisor=${percent(value.unknownDivisor)} carry/borrow=${percent(value.carryOrBorrow)}`
	]
}

function compositionLines(value: CompositionSummary): string[] {
	return [
		`modes normal=${percent(value.normalMode.rate)} alternate=${percent(value.alternateMode.rate)} random=${percent(value.randomMode.rate)}`,
		`forms unknown-operand=${percent(value.unknownOperand.rate)} negative-sub=${percent(value.negativeSubtraction.rate)} unknown-divisor=${percent(value.unknownDivisor.rate)} carry/borrow=${percent(value.carryOrBorrow.rate)}`
	]
}

function phaseLines(value: {
	phases: Record<'early' | 'mid' | 'late', StepMetrics>
}): string[] {
	return (['early', 'mid', 'late'] as const).map((phase) =>
		stepLine(`  ${phase}`, value.phases[phase])
	)
}

function dedicatedLines(values: DedicatedSummary[]): string[] {
	return values.flatMap((value) => [
		`${value.operator}: start=${value.startingSkill.toFixed(0)} final=${value.finalSkill.toFixed(2)} range=${value.finalSkillRange.min.toFixed(0)}–${value.finalSkillRange.max.toFixed(0)}`,
		stepLine('  mechanics', value),
		...phaseLines(value),
		...compositionLines(value.composition).map((line) => `  ${line}`)
	])
}

function dedicatedComparisonLines(
	baseline: DedicatedSummary[],
	candidate: DedicatedSummary[],
	delta: DedicatedDelta[]
): string[] {
	return delta.flatMap((difference) => {
		const base = baseline.find(
			(value) => value.operator === difference.operator
		)
		const next = candidate.find(
			(value) => value.operator === difference.operator
		)
		if (base === undefined || next === undefined) {
			throw new Error(`Missing ${difference.operator} comparison summary`)
		}
		return [
			difference.operator,
			...primaryComparisonLines(base, next, difference, {
				baseline: base.finalSkill,
				candidate: next.finalSkill,
				delta: difference.finalSkill
			}),
			...phaseLines(difference),
			...compositionDeltaLines(difference.composition).map(
				(line) => `  ${line}`
			)
		]
	})
}

function allModeLines(value: AllModeSummary): string[] {
	return [
		`final skills: ${value.finalSkills.map((skill) => skill.toFixed(2)).join(', ')}`,
		stepLine('mechanics', value),
		...phaseLines(value),
		...value.operators.map(
			(operator) =>
				`${operator.operator.padEnd(14)} share=${percent(operator.selectionShare)} final=${operator.finalSkill.toFixed(2)} gain=${operator.meanCorrectGain.toFixed(2)} penalty=${operator.meanIncorrectPenalty.toFixed(2)} difficulty=${operator.meanDifficulty.toFixed(2)}`
		),
		...compositionLines(value.composition)
	]
}

function allModeComparisonLines(
	baseline: AllModeSummary,
	candidate: AllModeSummary,
	delta: AllModeDelta
): string[] {
	return [
		`Final skills baseline=${baseline.finalSkills.map(number).join(', ')} candidate=${candidate.finalSkills.map(number).join(', ')} delta=${delta.finalSkills.map(number).join(', ')}`,
		...primaryComparisonLines(baseline, candidate, delta),
		...phaseLines(delta),
		...delta.operators.map((difference) => {
			const base = baseline.operators.find(
				(value) => value.operator === difference.operator
			)
			const next = candidate.operators.find(
				(value) => value.operator === difference.operator
			)
			if (base === undefined || next === undefined) {
				throw new Error(`Missing ${difference.operator} all-mode summary`)
			}
			return `${difference.operator.padEnd(14)} share=${percent(base.selectionShare)}→${percent(next.selectionShare)} (${percent(difference.selectionShare)}) final=${number(base.finalSkill)}→${number(next.finalSkill)} (${number(difference.finalSkill)}) gain=${number(base.meanCorrectGain)}→${number(next.meanCorrectGain)} (${number(difference.meanCorrectGain)}) penalty=${number(base.meanIncorrectPenalty)}→${number(next.meanIncorrectPenalty)} (${number(difference.meanIncorrectPenalty)}) difficulty=${number(base.meanDifficulty)}→${number(next.meanDifficulty)} (${number(difference.meanDifficulty)})`
		}),
		...compositionDeltaLines(delta.composition)
	]
}

export function formatTuningAnalysisArtifact(artifact: Artifact): string {
	const lines = [
		`Mode: ${artifact.mode}`,
		inputLine(artifact),
		`Seeds: ${artifact.config.seeds.join(', ')}`,
		`Operators: ${artifact.config.operators.join(', ')}`,
		`Steps per run: ${artifact.config.steps}`,
		`Answer input: ${percent(artifact.config.accuracy)} correct at ${artifact.config.responseSeconds}s`,
		`Starting skills: ${artifact.config.startingSkills.join(', ')}`,
		`Phase thresholds: early < ${artifact.config.phaseThresholds.calibration}, mid < ${artifact.config.phaseThresholds.taper}`,
		`Elapsed: ${artifact.elapsedMs.toFixed(1)}ms`,
		...(artifact.mode === 'comparison' ? tuningChangeLines(artifact) : []),
		''
	]
	if (artifact.mode === 'standalone') {
		lines.push(
			'Dedicated operator progression',
			...dedicatedLines(artifact.summary.dedicated)
		)
		if (artifact.summary.allOperator !== undefined) {
			lines.push(
				'',
				'All-operator interaction',
				...allModeLines(artifact.summary.allOperator)
			)
		}
	} else {
		lines.push(
			'Dedicated operator comparisons',
			...dedicatedComparisonLines(
				artifact.summary.baseline.dedicated,
				artifact.summary.candidate.dedicated,
				artifact.summary.delta.dedicated
			)
		)
		if (
			artifact.summary.baseline.allOperator !== undefined &&
			artifact.summary.candidate.allOperator !== undefined &&
			artifact.summary.delta.allOperator !== undefined
		) {
			lines.push(
				'',
				'All-operator comparison',
				...allModeComparisonLines(
					artifact.summary.baseline.allOperator,
					artifact.summary.candidate.allOperator,
					artifact.summary.delta.allOperator
				)
			)
		}
	}
	return lines.join('\n')
}
