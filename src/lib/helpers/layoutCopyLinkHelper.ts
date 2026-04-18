import { getQuiz } from '$lib/helpers/quizHelper'
import { buildQuizParams } from '$lib/helpers/urlParamsHelper'
import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'

type CopyLinkStartActions = {
	canCopyLink?: (() => boolean) | undefined
	getCopyLinkSearchParams?: (() => URLSearchParams) | undefined
}

type SeedCache = {
	get(key: string): number | undefined
	set(key: string, value: number): void
}

export function canCopyLink(
	startActions: CopyLinkStartActions | undefined
): boolean {
	if (!startActions?.canCopyLink) return true
	return startActions.canCopyLink()
}

export function resolveCopyLinkSearchParams(
	startActions: CopyLinkStartActions | undefined,
	locationSearch: string
): URLSearchParams {
	return (
		startActions?.getCopyLinkSearchParams?.() ??
		new URLSearchParams(locationSearch)
	)
}

export function resolveCopyLinkSuccessMessage(
	deterministic: boolean,
	messages: {
		deterministic: string
		standard: string
	}
): string {
	return deterministic ? messages.deterministic : messages.standard
}

export function getDeterministicSeedForQuery(
	searchParams: URLSearchParams,
	seedCache: SeedCache,
	random: () => number = Math.random
): number {
	const parsedSeed = parseQuizUrlQuery(searchParams).seed
	if (parsedSeed !== undefined) return parsedSeed

	const canonicalQueryKey = buildQuizParams(getQuiz(searchParams)).toString()
	const existingSeed = seedCache.get(canonicalQueryKey)
	if (existingSeed !== undefined) return existingSeed

	const generatedSeed = (random() * 0x100000000) >>> 0
	seedCache.set(canonicalQueryKey, generatedSeed)
	return generatedSeed
}

export function buildCanonicalCopyBaseUrl(
	searchParams: URLSearchParams,
	origin: string
): string {
	const canonicalQuiz = getQuiz(searchParams)
	const baseUrl = new URL(origin)
	baseUrl.pathname = '/'
	baseUrl.search = buildQuizParams(canonicalQuiz).toString()
	return baseUrl.toString()
}
