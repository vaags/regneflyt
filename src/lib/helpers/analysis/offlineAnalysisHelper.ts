import { OperatorExtended } from '$lib/constants/Operator'
import {
	adaptiveTuning,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'
import type { OfflineAnalysisCorrectnessMode } from '$lib/models/OfflineAnalysisTypes'
import { runOfflineSimulation } from '$lib/helpers/analysis/offlineAnalysisRunner'
import { safeParse } from 'valibot'
import { adaptiveTuningSnapshotSchema } from '$lib/models/persistedSchemas'

export type OfflineAnalysisScenario = {
	title: string
	operator: OperatorExtended
	steps: number
	responseSpeed: number
	correctnessMode: OfflineAnalysisCorrectnessMode
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

export function loadTuningSnapshot(override: unknown): typeof adaptiveTuning {
	if (override === undefined) {
		return adaptiveTuning
	}
	const result = safeParse(adaptiveTuningSnapshotSchema, override)
	if (!result.success) {
		const firstIssue = result.issues.at(0)
		if (firstIssue === undefined) {
			throw new Error('Invalid tuning snapshot')
		}
		const path = firstIssue.path?.map((item) => String(item.key)).join('.')
		if (path !== undefined && path.length > 0) {
			throw new Error(
				`Invalid tuning snapshot at ${path}: ${firstIssue.message}`
			)
		}
		throw new Error(`Invalid tuning snapshot: ${firstIssue.message}`)
	}
	return result.output
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
