import { describe, expect, it } from 'vitest'
import {
	defaultMatrixSeeds,
	parseOfflineAnalysisCliArgs
} from '#lib/helpers/analysis/offlineAnalysisCliHelper.ts'

describe('offlineAnalysisCliHelper', () => {
	it('parses default CLI options', () => {
		const options = parseOfflineAnalysisCliArgs([])

		expect(options.seeds).toEqual(defaultMatrixSeeds)
		expect(options.compare).toBe(false)
		expect(options.matrix).toBe(false)
		expect(options.review).toBe(false)
		expect(options.scope).toBe('narrow')
	})

	it('parses matrix mode and normalizes steps', () => {
		const options = parseOfflineAnalysisCliArgs([
			'--matrix',
			'--steps',
			'2.8',
			'--operators',
			'addition,subtraction,addition',
			'--seeds',
			'1,42'
		])

		expect(options.matrix).toBe(true)
		expect(options.compare).toBe(true)
		expect(options.steps).toBe(2)
		expect(options.operators).toEqual(['addition', 'subtraction'])
		expect(options.seeds).toEqual([1, 42])
	})

	it('rejects unknown operators', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--operators', 'foo'])).toThrow(
			'Unknown operator(s) in --operators foo'
		)
	})

	it('rejects flags that are missing required values', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--scope'])).toThrow(
			'Missing value for --scope'
		)
	})

	it('rejects unknown scopes', () => {
		expect(() =>
			parseOfflineAnalysisCliArgs(['--scope', 'invalid-scope'])
		).toThrow('Unknown --scope value invalid-scope')
	})

	it('rejects invalid seed and seed list values', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--seed', 'nan-seed'])).toThrow(
			'Invalid --seed value nan-seed'
		)
		expect(() => parseOfflineAnalysisCliArgs(['--seeds', '1,foo'])).toThrow(
			'Invalid --seeds value 1,foo'
		)
	})

	it('rejects unknown arguments', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--bogus'])).toThrow(
			'Unknown argument --bogus'
		)
		expect(() =>
			parseOfflineAnalysisCliArgs(['--seed', '42', 'stray'])
		).toThrow('Unknown argument stray')
	})
})
