import { OperatorExtended } from '$lib/constants/Operator'
import {
	adaptiveTuning,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import { runOfflineSimulation } from '$lib/helpers/analysis/offlineAnalysisRunner'

export type OfflineAnalysisScenario = {
	title: string
	operator: OperatorExtended
	steps: number
	responseSpeed: number
	correctnessMode: 'correct' | 'incorrect' | 'mixed'
	mixedAccuracy: number
	seed: number
	startingSkills: AdaptiveSkillMap
	tuning?: typeof adaptiveTuning
}

export type OfflineAnalysisResult = {
	scenario: OfflineAnalysisScenario
	correctCount: number
	incorrectCount: number
	meanSkillDelta: number
	finalSkills: AdaptiveSkillMap
	steps: number
}

export type OfflineAnalysisComparison = {
	baseline: OfflineAnalysisResult
	candidate: OfflineAnalysisResult
	delta: {
		correctCount: number
		incorrectCount: number
		meanSkillDelta: number
		finalSkills: AdaptiveSkillMap
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`${path} must be a finite number`)
	}

	return value
}

function assertExactKeys(
	value: Record<string, unknown>,
	expectedKeys: readonly string[],
	path: string
): void {
	const actualKeys = Object.keys(value).sort()
	const expectedSorted = [...expectedKeys].sort()
	if (
		actualKeys.length !== expectedSorted.length ||
		actualKeys.some((key, index) => key !== expectedSorted[index])
	) {
		throw new Error(
			`${path} must contain exactly: ${expectedSorted.join(', ')}`
		)
	}
}

function validateNumberTupleSection(
	value: unknown,
	path: string
): readonly [number, number] {
	if (!Array.isArray(value)) {
		throw new Error(`${path} must be an array`)
	}
	if (value.length !== 2) {
		throw new Error(`${path} must contain exactly 2 numbers`)
	}

	return [
		assertNumber(value[0], `${path}[0]`),
		assertNumber(value[1], `${path}[1]`)
	]
}

function validateSection<T>(
	value: unknown,
	path: string,
	expectedKeys: readonly string[],
	build: (section: Record<string, unknown>) => T
): T {
	if (!isRecord(value)) {
		throw new Error(`${path} must be an object`)
	}

	assertExactKeys(value, expectedKeys, path)

	return build(value)
}

function validateGainsSection(
	value: unknown,
	path: string
): typeof adaptiveTuning.gains {
	return validateSection(
		value,
		path,
		Object.keys(adaptiveTuning.gains),
		(section) => ({
			baseSkillGain: assertNumber(
				section.baseSkillGain,
				`${path}.baseSkillGain`
			),
			speedGainRange: validateNumberTupleSection(
				section.speedGainRange,
				`${path}.speedGainRange`
			),
			confidenceSpeedBands: validateNumberTupleSection(
				section.confidenceSpeedBands,
				`${path}.confidenceSpeedBands`
			),
			confidenceEffect: assertNumber(
				section.confidenceEffect,
				`${path}.confidenceEffect`
			)
		})
	)
}

export function loadTuningSnapshot(override: unknown): typeof adaptiveTuning {
	if (override === undefined) {
		return adaptiveTuning
	}
	if (!isRecord(override)) {
		throw new Error('Tuning override must be an object')
	}

	assertExactKeys(override, Object.keys(adaptiveTuning), 'tuning')

	const skillBounds = validateSection(
		override.skillBounds,
		'tuning.skillBounds',
		Object.keys(adaptiveTuning.skillBounds),
		(section) => ({
			minSkill: assertNumber(section.minSkill, 'tuning.skillBounds.minSkill'),
			maxSkill: assertNumber(section.maxSkill, 'tuning.skillBounds.maxSkill')
		})
	)
	const operatorMixing = validateSection(
		override.operatorMixing,
		'tuning.operatorMixing',
		Object.keys(adaptiveTuning.operatorMixing),
		(section) => ({
			operatorWeightBase: assertNumber(
				section.operatorWeightBase,
				'tuning.operatorMixing.operatorWeightBase'
			),
			skillGapDampingFactor: assertNumber(
				section.skillGapDampingFactor,
				'tuning.operatorMixing.skillGapDampingFactor'
			),
			weakOperatorMinDifficultyBoost: assertNumber(
				section.weakOperatorMinDifficultyBoost,
				'tuning.operatorMixing.weakOperatorMinDifficultyBoost'
			),
			weakOperatorGapThreshold: assertNumber(
				section.weakOperatorGapThreshold,
				'tuning.operatorMixing.weakOperatorGapThreshold'
			)
		})
	)
	const timing = validateSection(
		override.timing,
		'tuning.timing',
		Object.keys(adaptiveTuning.timing),
		(section) => ({
			maxDurationSeconds: assertNumber(
				section.maxDurationSeconds,
				'tuning.timing.maxDurationSeconds'
			),
			maxDurationAtMaxSkill: assertNumber(
				section.maxDurationAtMaxSkill,
				'tuning.timing.maxDurationAtMaxSkill'
			)
		})
	)
	const penalties = validateSection(
		override.penalties,
		'tuning.penalties',
		Object.keys(adaptiveTuning.penalties),
		(section) => ({
			basePenalty: assertNumber(
				section.basePenalty,
				'tuning.penalties.basePenalty'
			),
			slownessPenaltyBonus: assertNumber(
				section.slownessPenaltyBonus,
				'tuning.penalties.slownessPenaltyBonus'
			),
			lowSkillPenaltyCapThreshold: assertNumber(
				section.lowSkillPenaltyCapThreshold,
				'tuning.penalties.lowSkillPenaltyCapThreshold'
			),
			lowSkillPenaltyCapFraction: assertNumber(
				section.lowSkillPenaltyCapFraction,
				'tuning.penalties.lowSkillPenaltyCapFraction'
			),
			cooldownSteps: assertNumber(
				section.cooldownSteps,
				'tuning.penalties.cooldownSteps'
			),
			cooldownRangeReduction: assertNumber(
				section.cooldownRangeReduction,
				'tuning.penalties.cooldownRangeReduction'
			)
		})
	)
	const streak = validateSection(
		override.streak,
		'tuning.streak',
		Object.keys(adaptiveTuning.streak),
		(section) => ({
			streakBoostThreshold: assertNumber(
				section.streakBoostThreshold,
				'tuning.streak.streakBoostThreshold'
			),
			streakBoostMultiplier: assertNumber(
				section.streakBoostMultiplier,
				'tuning.streak.streakBoostMultiplier'
			),
			streakBoostMaxSpeedFraction: assertNumber(
				section.streakBoostMaxSpeedFraction,
				'tuning.streak.streakBoostMaxSpeedFraction'
			)
		})
	)
	const calibration = validateSection(
		override.calibration,
		'tuning.calibration',
		Object.keys(adaptiveTuning.calibration),
		(section) => ({
			calibrationThreshold: assertNumber(
				section.calibrationThreshold,
				'tuning.calibration.calibrationThreshold'
			),
			calibrationMaxBoost: assertNumber(
				section.calibrationMaxBoost,
				'tuning.calibration.calibrationMaxBoost'
			),
			taperThreshold: assertNumber(
				section.taperThreshold,
				'tuning.calibration.taperThreshold'
			),
			taperMinGain: assertNumber(
				section.taperMinGain,
				'tuning.calibration.taperMinGain'
			)
		})
	)
	const additionSubtraction = validateSection(
		override.additionSubtraction,
		'tuning.additionSubtraction',
		Object.keys(adaptiveTuning.additionSubtraction),
		(section) => ({
			rangeBase: assertNumber(
				section.rangeBase,
				'tuning.additionSubtraction.rangeBase'
			),
			rangeScale: assertNumber(
				section.rangeScale,
				'tuning.additionSubtraction.rangeScale'
			),
			addSubExponent: assertNumber(
				section.addSubExponent,
				'tuning.additionSubtraction.addSubExponent'
			),
			lowerBoundScale: assertNumber(
				section.lowerBoundScale,
				'tuning.additionSubtraction.lowerBoundScale'
			),
			secondOperandSkillLag: assertNumber(
				section.secondOperandSkillLag,
				'tuning.additionSubtraction.secondOperandSkillLag'
			),
			carryBorrowSkillThreshold: assertNumber(
				section.carryBorrowSkillThreshold,
				'tuning.additionSubtraction.carryBorrowSkillThreshold'
			)
		})
	)
	const thresholds = validateSection(
		override.thresholds,
		'tuning.thresholds',
		Object.keys(adaptiveTuning.thresholds),
		(section) => ({
			minDifficultyRatio: assertNumber(
				section.minDifficultyRatio,
				'tuning.thresholds.minDifficultyRatio'
			),
			difficultyWindowOvershoot: assertNumber(
				section.difficultyWindowOvershoot,
				'tuning.thresholds.difficultyWindowOvershoot'
			),
			minWindowSize: assertNumber(
				section.minWindowSize,
				'tuning.thresholds.minWindowSize'
			)
		})
	)
	const multiplicationDivision = validateSection(
		override.multiplicationDivision,
		'tuning.multiplicationDivision',
		Object.keys(adaptiveTuning.multiplicationDivision),
		(section) => ({
			tablesBase: assertNumber(
				section.tablesBase,
				'tuning.multiplicationDivision.tablesBase'
			),
			tablesScale: assertNumber(
				section.tablesScale,
				'tuning.multiplicationDivision.tablesScale'
			),
			tablesExponent: assertNumber(
				section.tablesExponent,
				'tuning.multiplicationDivision.tablesExponent'
			),
			tablesDropScale: assertNumber(
				section.tablesDropScale,
				'tuning.multiplicationDivision.tablesDropScale'
			),
			factorMin: assertNumber(
				section.factorMin,
				'tuning.multiplicationDivision.factorMin'
			),
			factorMax: assertNumber(
				section.factorMax,
				'tuning.multiplicationDivision.factorMax'
			),
			factorMinAtMaxSkill: assertNumber(
				section.factorMinAtMaxSkill,
				'tuning.multiplicationDivision.factorMinAtMaxSkill'
			),
			factorMaxAtMinSkill: assertNumber(
				section.factorMaxAtMinSkill,
				'tuning.multiplicationDivision.factorMaxAtMinSkill'
			)
		})
	)
	const puzzleMode = validateSection(
		override.puzzleMode,
		'tuning.puzzleMode',
		Object.keys(adaptiveTuning.puzzleMode),
		(section) => ({
			alternateMidpoint: assertNumber(
				section.alternateMidpoint,
				'tuning.puzzleMode.alternateMidpoint'
			),
			randomMidpoint: assertNumber(
				section.randomMidpoint,
				'tuning.puzzleMode.randomMidpoint'
			),
			transitionSpread: assertNumber(
				section.transitionSpread,
				'tuning.puzzleMode.transitionSpread'
			)
		})
	)
	const algebraicRollout = validateSection(
		override.algebraicRollout,
		'tuning.algebraicRollout',
		Object.keys(adaptiveTuning.algebraicRollout),
		(section) => ({
			algebraicSkillOffset: assertNumber(
				section.algebraicSkillOffset,
				'tuning.algebraicRollout.algebraicSkillOffset'
			),
			negativeSubStartSkill: assertNumber(
				section.negativeSubStartSkill,
				'tuning.algebraicRollout.negativeSubStartSkill'
			),
			negativeSubFullSkill: assertNumber(
				section.negativeSubFullSkill,
				'tuning.algebraicRollout.negativeSubFullSkill'
			),
			divisorUnknownStartSkill: assertNumber(
				section.divisorUnknownStartSkill,
				'tuning.algebraicRollout.divisorUnknownStartSkill'
			),
			divisorUnknownFullSkill: assertNumber(
				section.divisorUnknownFullSkill,
				'tuning.algebraicRollout.divisorUnknownFullSkill'
			),
			divisorUnknownProbability: assertNumber(
				section.divisorUnknownProbability,
				'tuning.algebraicRollout.divisorUnknownProbability'
			)
		})
	)
	const difficultyScoring = validateSection(
		override.difficultyScoring,
		'tuning.difficultyScoring',
		Object.keys(adaptiveTuning.difficultyScoring),
		(section) => ({
			minorOperandWeight: assertNumber(
				section.minorOperandWeight,
				'tuning.difficultyScoring.minorOperandWeight'
			),
			carryBorrowBoost: assertNumber(
				section.carryBorrowBoost,
				'tuning.difficultyScoring.carryBorrowBoost'
			),
			noCarryDiscount: assertNumber(
				section.noCarryDiscount,
				'tuning.difficultyScoring.noCarryDiscount'
			),
			maxTableDifficultyScore: assertNumber(
				section.maxTableDifficultyScore,
				'tuning.difficultyScoring.maxTableDifficultyScore'
			),
			addSubBase: assertNumber(
				section.addSubBase,
				'tuning.difficultyScoring.addSubBase'
			),
			addScale: assertNumber(
				section.addScale,
				'tuning.difficultyScoring.addScale'
			),
			subScale: assertNumber(
				section.subScale,
				'tuning.difficultyScoring.subScale'
			),
			factorWeight: assertNumber(
				section.factorWeight,
				'tuning.difficultyScoring.factorWeight'
			),
			identityFactorMultiplier: assertNumber(
				section.identityFactorMultiplier,
				'tuning.difficultyScoring.identityFactorMultiplier'
			),
			mulDivExponent: assertNumber(
				section.mulDivExponent,
				'tuning.difficultyScoring.mulDivExponent'
			)
		})
	)
	const remediation = validateSection(
		override.remediation,
		'tuning.remediation',
		Object.keys(adaptiveTuning.remediation),
		(section) => ({
			thresholdAccuracy: assertNumber(
				section.thresholdAccuracy,
				'tuning.remediation.thresholdAccuracy'
			),
			minPuzzles: assertNumber(
				section.minPuzzles,
				'tuning.remediation.minPuzzles'
			),
			slowResponseSeconds: assertNumber(
				section.slowResponseSeconds,
				'tuning.remediation.slowResponseSeconds'
			),
			fastLowAccuracyMinPuzzles: assertNumber(
				section.fastLowAccuracyMinPuzzles,
				'tuning.remediation.fastLowAccuracyMinPuzzles'
			)
		})
	)

	return {
		skillBounds,
		operatorMixing,
		timing,
		penalties,
		gains: validateGainsSection(override.gains, 'tuning.gains'),
		streak,
		calibration,
		additionSubtraction,
		thresholds,
		multiplicationDivision,
		puzzleMode,
		algebraicRollout,
		difficultyScoring,
		remediation
	}
}

export function createDefaultOfflineScenario(): OfflineAnalysisScenario {
	return {
		title: 'default-all-operators',
		operator: OperatorExtended.All,
		steps: 100,
		responseSpeed: 3,
		correctnessMode: 'mixed',
		mixedAccuracy: 0.7,
		seed: 1,
		startingSkills: [...defaultAdaptiveSkillMap] as AdaptiveSkillMap,
		tuning: adaptiveTuning
	}
}

export function runOfflineAnalysis(
	scenario: OfflineAnalysisScenario
): OfflineAnalysisResult {
	const simulationSteps = runOfflineSimulation({
		tuning: scenario.tuning ?? adaptiveTuning,
		startingSkills: scenario.startingSkills,
		operator: scenario.operator,
		steps: scenario.steps,
		responseSpeed: scenario.responseSpeed,
		correctnessMode: scenario.correctnessMode,
		mixedAccuracy: scenario.mixedAccuracy,
		seed: scenario.seed
	})

	const correctCount = simulationSteps.filter((step) => step.isCorrect).length
	const incorrectCount = simulationSteps.length - correctCount
	const meanSkillDelta =
		simulationSteps.length > 0
			? simulationSteps.reduce(
					(sum, step) => sum + (step.skillAfter - step.skillBefore),
					0
				) / simulationSteps.length
			: 0

	return {
		scenario,
		steps: simulationSteps.length,
		correctCount,
		incorrectCount,
		meanSkillDelta,
		finalSkills: simulationSteps.at(-1)?.allSkills ?? [
			...scenario.startingSkills
		]
	}
}

export function formatOfflineAnalysisReport(
	result: OfflineAnalysisResult
): string {
	return [
		`Scenario: ${result.scenario.title}`,
		`Seed: ${result.scenario.seed}`,
		`Steps: ${result.steps}`,
		`Correct: ${result.correctCount}`,
		`Incorrect: ${result.incorrectCount}`,
		`Mean skill delta: ${result.meanSkillDelta.toFixed(2)}`,
		`Final skills: ${result.finalSkills.join(', ')}`
	].join('\n')
}

export function compareOfflineAnalysisResults(
	baseline: OfflineAnalysisResult,
	candidate: OfflineAnalysisResult
): OfflineAnalysisComparison {
	return {
		baseline,
		candidate,
		delta: {
			correctCount: candidate.correctCount - baseline.correctCount,
			incorrectCount: candidate.incorrectCount - baseline.incorrectCount,
			meanSkillDelta: candidate.meanSkillDelta - baseline.meanSkillDelta,
			finalSkills: [
				candidate.finalSkills[0] - baseline.finalSkills[0],
				candidate.finalSkills[1] - baseline.finalSkills[1],
				candidate.finalSkills[2] - baseline.finalSkills[2],
				candidate.finalSkills[3] - baseline.finalSkills[3]
			] as AdaptiveSkillMap
		}
	}
}

export function formatOfflineAnalysisComparison(
	comparison: OfflineAnalysisComparison
): string {
	return [
		`Baseline: ${comparison.baseline.scenario.title}`,
		`Candidate: ${comparison.candidate.scenario.title}`,
		`Correct count delta: ${comparison.delta.correctCount}`,
		`Incorrect count delta: ${comparison.delta.incorrectCount}`,
		`Mean skill delta: ${comparison.delta.meanSkillDelta.toFixed(2)}`,
		`Final skills delta: ${comparison.delta.finalSkills.join(', ')}`
	].join('\n')
}
