import { spawnSync } from 'node:child_process'
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/models/AdaptiveProfile.ts'

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

	it('prints help without running analysis', () => {
		const result = runOfflineAnalysisScript(['--help'])

		expect(result.status).toBe(0)
		expect(result.stdout).toContain(
			'Run deterministic adaptive-model analysis and tuning comparisons.'
		)
		expect(result.stdout).toContain('--baseline-tuning <path>')
		expect(result.stdout).not.toContain('Saved offline text report to:')
		expect(result.stderr).toBe('')
	})

	it('runs a preset review and writes default artifacts', () => {
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
		expect(result.stdout).toContain('═══ METRICS ═══')
		expect(result.stdout).toContain('═══ SIMULATED PROGRESSION REVIEW ═══')
		expect(result.stdout).toContain('Phase Breakdown:')
		expect(result.stdout).toContain('Early: stepDelta=')
		expect(result.stdout).toContain('Mid: stepDelta=')
		expect(result.stdout).toContain('Late: stepDelta=')
		const outputPathMatch = /Saved matrix text report to: (.+)/.exec(
			result.stdout
		)
		expect(outputPathMatch).not.toBeNull()
		const outputPath = outputPathMatch?.[1]?.trim()
		expect(outputPath).toMatch(/\/analysis-artifacts\/review-matrix-.+\.txt$/)
		if (outputPath === undefined) {
			throw new Error('Expected output path in script output')
		}
		generatedOutputFiles.push(outputPath, `${outputPath}.json`)
		expect(existsSync(outputPath)).toBe(true)
		expect(existsSync(`${outputPath}.json`)).toBe(true)
		expect(
			JSON.parse(readFileSync(`${outputPath}.json`, 'utf8'))
		).toMatchObject({
			review: { evidence: { sufficient: true } }
		})
	})

	it('returns an invalid review error through the command entrypoint', () => {
		const result = runOfflineAnalysisScript(['--review'])

		expect(result.status).not.toBe(0)
		expect(`${result.stderr}${result.stdout}`).toContain(
			'--review requires --compare or --matrix'
		)
	})
})
