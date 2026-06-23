import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
	const generatedOutputFiles: string[] = []

	afterEach(() => {
		while (generatedOutputFiles.length > 0) {
			const nextOutput = generatedOutputFiles.pop()
			if (nextOutput !== undefined) {
				rmSync(nextOutput, { force: true })
			}
		}

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
		expect(result.stdout).toContain('═══ FINDINGS ═══')
		expect(result.stdout).toContain('Phase Breakdown:')
		expect(result.stdout).toContain('Early: stepDelta=')
		expect(result.stdout).toContain('Mid: stepDelta=')
		expect(result.stdout).toContain('Late: stepDelta=')
		expect(result.stdout).toContain('"broadChangePolicySatisfied": true')
	})

	it('prints structured compare review sections in stable order', () => {
		const fixtures = createTuningFixtures('offline-analysis-compare-structure')
		tempDirs.push(fixtures.tempDir)
		const result = runOfflineAnalysisScript([
			'--review',
			'--compare',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath
		])

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('═══ FINDINGS ═══')
		expect(result.stdout).toContain('═══ INTERPRETATION ═══')
		expect(result.stdout).toContain('═══ METADATA ═══')

		const findingsIndex = result.stdout.indexOf('═══ FINDINGS ═══')
		const interpretationIndex = result.stdout.indexOf('═══ INTERPRETATION ═══')
		const metadataIndex = result.stdout.indexOf('═══ METADATA ═══')

		expect(findingsIndex).toBeGreaterThanOrEqual(0)
		expect(interpretationIndex).toBeGreaterThan(findingsIndex)
		expect(metadataIndex).toBeGreaterThan(interpretationIndex)
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

	it('writes compare artifacts under analysis-artifacts when --out is omitted', () => {
		const fixtures = createTuningFixtures('offline-analysis-auto-out')
		tempDirs.push(fixtures.tempDir)

		const result = runOfflineAnalysisScript([
			'--compare',
			'--baseline-tuning',
			fixtures.baselinePath,
			'--candidate-tuning',
			fixtures.candidatePath
		])

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('Saved comparison text report to:')

		const outputPathMatch = /Saved comparison text report to: (.+)/.exec(
			result.stdout
		)
		expect(outputPathMatch).not.toBeNull()
		if (outputPathMatch === null) {
			throw new Error('Expected output path in script output')
		}

		const outputPathRaw = outputPathMatch[1]
		if (outputPathRaw === undefined) {
			throw new Error('Expected captured output path in script output')
		}

		const outputPath = outputPathRaw.trim()
		expect(outputPath.length).toBeGreaterThan(0)
		expect(outputPath).toContain('/analysis-artifacts/')
		generatedOutputFiles.push(outputPath)
		expect(existsSync(outputPath)).toBe(true)
	})
})
