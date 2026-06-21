import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'

function runOfflineAnalysisScript(args: string[]) {
	return spawnSync(
		'npm',
		['exec', '--yes', 'tsx', '--', 'scripts/offline-analysis.mjs', ...args],
		{ cwd: process.cwd(), encoding: 'utf8' }
	)
}

function createTuningFixtures(prefix: string): {
	tempDir: string
	baselinePath: string
	candidatePath: string
} {
	const tempDir = mkdtempSync(join(tmpdir(), `regneflyt-${prefix}-`))
	const baselinePath = join(tempDir, 'baseline.json')
	const candidatePath = join(tempDir, 'candidate.json')
	writeFileSync(baselinePath, JSON.stringify(adaptiveTuning, null, 2), 'utf8')
	writeFileSync(
		candidatePath,
		JSON.stringify(
			{
				...adaptiveTuning,
				gains: {
					...adaptiveTuning.gains,
					baseSkillGain: adaptiveTuning.gains.baseSkillGain * 1.1
				}
			},
			null,
			2
		),
		'utf8'
	)
	return { tempDir, baselinePath, candidatePath }
}

describe('offline-analysis script', () => {
	const tempDirs: string[] = []

	afterEach(() => {
		while (tempDirs.length > 0) {
			const nextDir = tempDirs.pop()
			if (nextDir !== undefined) {
				rmSync(nextDir, { recursive: true, force: true })
			}
		}
	})

	it('routes early-game preset through matrix evidence with configured operators', () => {
		const fixtures = createTuningFixtures('offline-analysis-script')
		tempDirs.push(fixtures.tempDir)
		const result = runOfflineAnalysisScript([
			'--review',
			'--compare',
			'--preset',
			'early-game',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath
		])

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('Preset: early-game')
		expect(result.stdout).toContain('Scope: narrow')
		expect(result.stdout).toContain(
			'Evidence: matrix, seeds=1,42, operators=addition,subtraction'
		)
		expect(result.stdout).toContain('Early phase delta:')
		expect(result.stdout).toContain('Mid phase delta:')
		expect(result.stdout).toContain('Late phase delta:')
		expect(result.stdout).toContain('"broadChangePolicySatisfied": true')
	})

	it('marks compare-only foundational review as advisory-only', () => {
		const fixtures = createTuningFixtures('offline-analysis-script')
		tempDirs.push(fixtures.tempDir)
		const result = runOfflineAnalysisScript([
			'--review',
			'--compare',
			'--scope',
			'foundational',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath
		])

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('Scope: foundational')
		expect(result.stdout).toContain(
			'Policy: matrix evidence required before approving foundational changes'
		)
		expect(result.stdout).toContain('Baseline early phase summary:')
		expect(result.stdout).toContain('Candidate early phase summary:')
		expect(result.stdout).toContain('Early phase delta:')
		expect(result.stdout).toContain('"phaseSummaries"')
		expect(result.stdout).toContain('"advisoryOnly": true')
		expect(result.stdout).toContain('"broadChangePolicySatisfied": false')
	})

	it('fails fast when --review is used without compare or matrix mode', () => {
		const result = runOfflineAnalysisScript(['--review'])

		expect(result.status).not.toBe(0)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'--review requires --compare or --matrix'
		)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'--preset early-game, --preset foundational, or --preset penalty'
		)
	})

	it('returns compare requirements when review compare is missing tuning files', () => {
		const result = runOfflineAnalysisScript(['--review', '--compare'])

		expect(result.status).not.toBe(0)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'Compare mode requires --baseline-tuning and --candidate-tuning'
		)
	})

	it('returns matrix requirements when preset review is missing tuning files', () => {
		const result = runOfflineAnalysisScript([
			'--review',
			'--preset',
			'early-game'
		])

		expect(result.status).not.toBe(0)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'Matrix mode requires --baseline-tuning and --candidate-tuning'
		)
	})

	it('returns a helpful error for unknown operator values', () => {
		const fixtures = createTuningFixtures('offline-analysis-script')
		tempDirs.push(fixtures.tempDir)
		const result = runOfflineAnalysisScript([
			'--review',
			'--compare',
			'--operators',
			'foo',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath
		])

		expect(result.status).not.toBe(0)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'Unknown operator(s) in --operators foo'
		)
	})

	it('returns a helpful error for unknown scope values', () => {
		const fixtures = createTuningFixtures('offline-analysis-script')
		tempDirs.push(fixtures.tempDir)
		const result = runOfflineAnalysisScript([
			'--review',
			'--compare',
			'--scope',
			'invalid-scope',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath
		])

		expect(result.status).not.toBe(0)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'Unknown --scope value invalid-scope'
		)
	})

	it('uses conservative minimum phase coverage in matrix review payload', () => {
		const fixtures = createTuningFixtures('offline-analysis-script')
		tempDirs.push(fixtures.tempDir)
		const result = runOfflineAnalysisScript([
			'--review',
			'--matrix',
			'--scope',
			'broad',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath,
			'--seeds',
			'1,42,99',
			'--operators',
			'addition,subtraction,all'
		])

		expect(result.status).toBe(0)

		const jsonStart = result.stdout.indexOf('{')
		expect(jsonStart).toBeGreaterThanOrEqual(0)
		const payload = JSON.parse(result.stdout.slice(jsonStart)) as {
			jsonSchemaVersion: string
			recommendation: {
				reason: string
				suppressedWarnings?: Array<{
					kind: string
					phase: string
					reason: string
				}>
			}
			summary: {
				phaseCoverage: {
					early: number
					mid: number
					late: number
				}
			}
			rows: Array<{
				phaseCoverage: {
					early: number
					mid: number
					late: number
				}
			}>
		}

		expect(payload.rows.length).toBeGreaterThan(0)
		expect(payload.jsonSchemaVersion).toBe('1.0.0')
		expect(payload.recommendation.reason.length).toBeGreaterThan(0)

		const minimumEarlyCoverage = Math.min(
			...payload.rows.map((row) => row.phaseCoverage.early)
		)
		const minimumMidCoverage = Math.min(
			...payload.rows.map((row) => row.phaseCoverage.mid)
		)
		const minimumLateCoverage = Math.min(
			...payload.rows.map((row) => row.phaseCoverage.late)
		)

		expect(payload.summary.phaseCoverage).toEqual({
			early: minimumEarlyCoverage,
			mid: minimumMidCoverage,
			late: minimumLateCoverage
		})
		expect(payload.recommendation.suppressedWarnings).toBeUndefined()
	})
})
