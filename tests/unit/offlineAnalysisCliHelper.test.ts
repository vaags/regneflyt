import { describe, expect, it } from 'vitest'
import {
	defaultMatrixSeeds,
	getOfflineAnalysisCliHelp,
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

	it('supports equals syntax and uses the final repeated option value', () => {
		const options = parseOfflineAnalysisCliArgs([
			'--seed=1',
			'--seed=42',
			'--operators=Addition,addition,DIVISION'
		])

		expect(options.seed).toBe(42)
		expect(options.operators).toEqual(['addition', 'division'])
	})

	it('creates isolated defaults for every parse', () => {
		const configured = parseOfflineAnalysisCliArgs([
			'--seeds',
			'7',
			'--operators',
			'addition'
		])
		configured.seeds.push(8)

		const defaults = parseOfflineAnalysisCliArgs([])

		expect(defaults.seeds).toEqual(defaultMatrixSeeds)
		expect(defaults.operators).toEqual([
			'addition',
			'subtraction',
			'multiplication',
			'division',
			'all'
		])
	})

	it('provides generated help describing the available options', () => {
		const help = getOfflineAnalysisCliHelp()

		expect(help).toContain('Run deterministic adaptive-model analysis')
		expect(help).toContain('--baseline-tuning <path>')
		expect(help).toContain('--scope <scope>')
		expect(parseOfflineAnalysisCliArgs(['--help']).help).toBe(true)
	})

	it('rejects unknown operators', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--operators', 'foo'])).toThrow(
			'Unknown operator(s) in --operators foo'
		)
	})

	it('rejects flags that are missing required values', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--scope'])).toThrow(
			/--scope.*argument missing/
		)
		expect(() => parseOfflineAnalysisCliArgs(['--title', '--help'])).toThrow(
			'Missing value for --title'
		)
	})

	it('rejects unknown scopes', () => {
		expect(() =>
			parseOfflineAnalysisCliArgs(['--scope', 'invalid-scope'])
		).toThrow('Allowed choices are narrow, broad, foundational')
	})

	it('rejects invalid seed and seed list values', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--seed', 'nan-seed'])).toThrow(
			'Invalid --seed value nan-seed'
		)
		expect(() => parseOfflineAnalysisCliArgs(['--seeds', '1,foo'])).toThrow(
			'Invalid --seeds value 1,foo'
		)
	})

	it('rejects unknown options and positional arguments', () => {
		expect(() => parseOfflineAnalysisCliArgs(['--bogus'])).toThrow(
			"unknown option '--bogus'"
		)
		expect(() =>
			parseOfflineAnalysisCliArgs(['--seed', '42', 'stray'])
		).toThrow('too many arguments')
	})

	it('rejects invalid steps and empty option lists', () => {
		expect(() =>
			parseOfflineAnalysisCliArgs(['--steps', 'not-a-number'])
		).toThrow('Invalid --steps value not-a-number')
		expect(() => parseOfflineAnalysisCliArgs(['--seeds', ',,,'])).toThrow(
			'Invalid --seeds value ,,,'
		)
		expect(() => parseOfflineAnalysisCliArgs(['--operators', ',,,'])).toThrow(
			'Unknown operator(s) in --operators ,,,'
		)
	})
})
