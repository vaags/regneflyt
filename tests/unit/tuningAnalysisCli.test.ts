import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { adaptiveTuning } from '#lib/domain/skill-progression/adaptiveTuning.ts'
import {
	getTuningAnalysisHelp,
	parseTuningAnalysisArgs
} from '#lib/helpers/analysis/tuningAnalysisCliHelper.ts'

const tempDirs: string[] = []

afterEach(() => {
	for (const directory of tempDirs.splice(0)) {
		rmSync(directory, { recursive: true, force: true })
	}
})

describe('tuning analysis CLI', () => {
	it('parses standard defaults and explicit overrides', () => {
		expect(parseTuningAnalysisArgs([])).toMatchObject({
			seeds: [1, 42, 99],
			operators: [
				'addition',
				'subtraction',
				'multiplication',
				'division',
				'all'
			],
			steps: 100,
			accuracy: 0.7,
			responseSeconds: 3,
			startingSkills: [0, 0, 0, 0]
		})
		expect(
			parseTuningAnalysisArgs([
				'--seeds',
				'7,8',
				'--operators',
				'addition,all',
				'--steps',
				'20',
				'--accuracy',
				'0.4',
				'--response-seconds',
				'6',
				'--starting-skills',
				'50'
			])
		).toMatchObject({
			seeds: [7, 8],
			operators: ['addition', 'all'],
			steps: 20,
			accuracy: 0.4,
			responseSeconds: 6,
			startingSkills: [50, 50, 50, 50]
		})
	})

	it('rejects ambiguous modes and invalid numeric inputs', () => {
		expect(() => parseTuningAnalysisArgs(['--baseline', 'base.json'])).toThrow(
			'requires both --baseline and --candidate'
		)
		expect(() =>
			parseTuningAnalysisArgs([
				'--tuning',
				'one.json',
				'--baseline',
				'base.json',
				'--candidate',
				'candidate.json'
			])
		).toThrow('--tuning cannot be combined')
		expect(() => parseTuningAnalysisArgs(['--accuracy', '70'])).toThrow(
			'--accuracy must be between 0 and 1'
		)
		expect(() =>
			parseTuningAnalysisArgs(['--starting-skills', '20,40'])
		).toThrow('--starting-skills requires one value or four')
	})

	it('documents the fixed-input limitation', () => {
		expect(getTuningAnalysisHelp()).toContain('not predicted learner outcomes')
	})

	it('runs comparison mode and writes one JSON artifact', () => {
		const directory = mkdtempSync(join(tmpdir(), 'regneflyt-tuning-analysis-'))
		tempDirs.push(directory)
		const baseline = join(directory, 'baseline.json')
		const candidate = join(directory, 'candidate.json')
		const output = join(directory, 'artifact.json')
		writeFileSync(baseline, JSON.stringify(adaptiveTuning), 'utf8')
		writeFileSync(candidate, JSON.stringify(adaptiveTuning), 'utf8')

		const result = spawnSync(
			'npx',
			[
				'tsx',
				'scripts/analyze-tuning.mjs',
				'--baseline',
				baseline,
				'--candidate',
				candidate,
				'--seeds',
				'1',
				'--operators',
				'addition',
				'--steps',
				'10',
				'--out',
				output
			],
			{ cwd: process.cwd(), encoding: 'utf8' }
		)

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('Mode: comparison')
		expect(JSON.parse(readFileSync(output, 'utf8'))).toMatchObject({
			schemaVersion: 2,
			mode: 'comparison',
			tunings: {
				baseline: adaptiveTuning,
				candidate: adaptiveTuning
			},
			tuningChanges: []
		})
	})

	it('runs standalone mode with repository tuning', () => {
		const directory = mkdtempSync(
			join(tmpdir(), 'regneflyt-tuning-standalone-')
		)
		tempDirs.push(directory)
		const output = join(directory, 'artifact.json')
		const result = spawnSync(
			'npx',
			[
				'tsx',
				'scripts/analyze-tuning.mjs',
				'--seeds',
				'1',
				'--operators',
				'addition',
				'--steps',
				'10',
				'--out',
				output
			],
			{ cwd: process.cwd(), encoding: 'utf8' }
		)

		expect(result.status).toBe(0)
		expect(result.stdout).toContain('Mode: standalone')
		expect(JSON.parse(readFileSync(output, 'utf8'))).toMatchObject({
			schemaVersion: 2,
			mode: 'standalone',
			tunings: { standalone: adaptiveTuning }
		})
	})
})
