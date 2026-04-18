import { describe, expect, it } from 'vitest'
import {
	buildCanonicalCopyBaseUrl,
	canCopyLink,
	getDeterministicSeedForQuery,
	resolveCopyLinkSearchParams,
	resolveCopyLinkSuccessMessage
} from '$lib/helpers/layoutCopyLinkHelper'
import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'

describe('canCopyLink', () => {
	it('allows copy when no start actions are provided', () => {
		expect(canCopyLink(undefined)).toBe(true)
	})

	it('allows copy when guard callback allows it', () => {
		expect(canCopyLink({ canCopyLink: () => true })).toBe(true)
	})

	it('blocks copy when guard callback rejects it', () => {
		expect(canCopyLink({ canCopyLink: () => false })).toBe(false)
	})
})

describe('resolveCopyLinkSearchParams', () => {
	it('uses sticky start-action search params when provided', () => {
		const params = resolveCopyLinkSearchParams(
			{
				getCopyLinkSearchParams: () =>
					new URLSearchParams('difficulty=0&duration=2')
			},
			'difficulty=1&duration=1'
		)

		expect(params.toString()).toBe('difficulty=0&duration=2')
	})

	it('falls back to current location search when no override exists', () => {
		const params = resolveCopyLinkSearchParams(
			undefined,
			'?difficulty=1&seed=9'
		)
		expect(params.toString()).toBe('difficulty=1&seed=9')
	})
})

describe('resolveCopyLinkSuccessMessage', () => {
	it('returns deterministic success message when deterministic mode is active', () => {
		expect(
			resolveCopyLinkSuccessMessage(true, {
				deterministic: 'deterministic',
				standard: 'standard'
			})
		).toBe('deterministic')
	})

	it('returns standard success message when deterministic mode is inactive', () => {
		expect(
			resolveCopyLinkSuccessMessage(false, {
				deterministic: 'deterministic',
				standard: 'standard'
			})
		).toBe('standard')
	})
})

describe('getDeterministicSeedForQuery', () => {
	it('returns explicit seed from query when present', () => {
		const cache = new Map<string, number>()
		const searchParams = new URLSearchParams('seed=1234&difficulty=1')

		expect(getDeterministicSeedForQuery(searchParams, cache)).toBe(1234)
		expect(cache.size).toBe(0)
	})

	it('returns cached seed for same canonical quiz query', () => {
		const cache = new Map<string, number>()
		const baseQuery = new URLSearchParams(
			'duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&divValues=2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false'
		)
		const first = getDeterministicSeedForQuery(baseQuery, cache, () => 0.5)
		const second = getDeterministicSeedForQuery(baseQuery, cache, () => 0.75)

		expect(first).toBe(second)
		expect(cache.size).toBe(1)
	})

	it('generates deterministic uint32 seed when missing', () => {
		const cache = new Map<string, number>()
		const searchParams = new URLSearchParams(
			`duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=${customAdaptiveDifficultyId}&allowNegativeAnswers=false`
		)

		const seed = getDeterministicSeedForQuery(searchParams, cache, () => 0.25)

		expect(seed).toBe(1073741824)
		expect(cache.size).toBe(1)
	})
})

describe('buildCanonicalCopyBaseUrl', () => {
	it('returns root-based canonical quiz URL', () => {
		const searchParams = new URLSearchParams(
			'duration=1&showProgressBar=true&operator=0&addMin=1&addMax=10&subMin=1&subMax=10&mulValues=2,3,4,5,6,7,8,9,10&divValues=2,3,4,5,6,7,8,9,10&puzzleMode=0&difficulty=1&allowNegativeAnswers=false'
		)

		const baseUrl = buildCanonicalCopyBaseUrl(
			searchParams,
			'https://regneflyt.test/quiz?ignored=true'
		)

		expect(baseUrl.startsWith('https://regneflyt.test/?')).toBe(true)
		expect(baseUrl.includes('duration=1')).toBe(true)
		expect(baseUrl.includes('difficulty=1')).toBe(true)
	})
})
