import { safeParse } from 'valibot'
import type { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import { validateAdaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuningValidation.ts'
import { adaptiveTuningSnapshotSchema } from '#lib/models/persistedSchemas.ts'
import {
	cloneTuning,
	subtractSummary,
	tuningChanges
} from './tuningAnalysisComparisonHelper.ts'
import { runAnalysis, summarize } from './tuningAnalysisSummaryHelper.ts'
import type {
	ArtifactBase,
	TuningAnalysisArtifact,
	TuningAnalysisConfig
} from './tuningAnalysisTypes.ts'

export function loadTuningSnapshot(
	value: unknown,
	path?: string
): typeof adaptiveTuning {
	const parsed = safeParse(adaptiveTuningSnapshotSchema, value)
	if (!parsed.success) {
		const issue = parsed.issues.at(0)
		if (issue === undefined) throw new Error('Invalid tuning snapshot')
		const issuePath = issue.path?.map((item) => String(item.key)).join('.')
		const hasIssuePath = issuePath !== undefined && issuePath.length > 0
		throw new Error(
			`Invalid tuning snapshot${path === undefined ? '' : ` at ${path}`}${hasIssuePath ? ` (${issuePath})` : ''}: ${issue.message}`
		)
	}
	try {
		validateAdaptiveTuning(parsed.output)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(
			`Invalid tuning snapshot${path === undefined ? '' : ` at ${path}`}: ${message}`
		)
	}
	return parsed.output
}

export function createTuningAnalysisArtifact(input: {
	config: TuningAnalysisConfig
	tuning?: typeof adaptiveTuning
	baseline?: typeof adaptiveTuning
	candidate?: typeof adaptiveTuning
	inputs: ArtifactBase['inputs']
	generatedAt: Date
}): TuningAnalysisArtifact {
	const reference = input.baseline ?? input.tuning
	if (reference === undefined) throw new Error('Analysis tuning is required')
	const phaseThresholds = {
		calibration: reference.calibration.calibrationThreshold,
		taper: reference.calibration.taperThreshold
	}
	if (input.tuning !== undefined) {
		const runs = runAnalysis({
			tuning: input.tuning,
			config: input.config,
			phaseThresholds
		})
		return {
			schemaVersion: 2,
			generatedAt: input.generatedAt.toISOString(),
			elapsedMs: 0,
			mode: 'standalone',
			tunings: { standalone: cloneTuning(input.tuning) },
			config: { ...input.config, phaseThresholds },
			inputs: input.inputs,
			runs,
			summary: summarize(runs, input.config)
		}
	}
	if (input.baseline === undefined || input.candidate === undefined) {
		throw new Error('Comparison baseline and candidate are required')
	}
	const baselineRuns = runAnalysis({
		tuning: input.baseline,
		config: input.config,
		phaseThresholds
	})
	const candidateRuns = runAnalysis({
		tuning: input.candidate,
		config: input.config,
		phaseThresholds
	})
	const baseline = summarize(baselineRuns, input.config)
	const candidate = summarize(candidateRuns, input.config)
	return {
		schemaVersion: 2,
		generatedAt: input.generatedAt.toISOString(),
		elapsedMs: 0,
		mode: 'comparison',
		tunings: {
			baseline: cloneTuning(input.baseline),
			candidate: cloneTuning(input.candidate)
		},
		tuningChanges: tuningChanges(input.baseline, input.candidate),
		config: { ...input.config, phaseThresholds },
		inputs: input.inputs,
		runs: baselineRuns.map((run, index) => {
			const candidateRun = candidateRuns[index]
			if (candidateRun === undefined) throw new Error('Missing candidate run')
			return {
				seed: run.seed,
				operator: run.operator,
				baseline: run,
				candidate: candidateRun
			}
		}),
		summary: {
			baseline,
			candidate,
			delta: subtractSummary(baseline, candidate)
		}
	}
}
