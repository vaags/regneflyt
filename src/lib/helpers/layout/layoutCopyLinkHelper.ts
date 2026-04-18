import { getQuiz } from '$lib/helpers/quiz/quizHelper'
import { buildCopyLinkUrl, buildQuizParams } from '$lib/helpers/urlParamsHelper'
import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'

type CopyLinkStartActions = {
	canCopyLink?: (() => boolean) | undefined
	getCopyLinkSearchParams?: (() => URLSearchParams) | undefined
}

type SeedCache = {
	get(key: string): number | undefined
	set(key: string, value: number): void
}

type ShowToastOptions = {
	variant?: 'success' | 'error'
}

type CopyFeedbackExecutor = (
	text: string,
	options: {
		writeText: ((text: string) => Promise<void>) | undefined
		onSuccess: () => void
		onError: () => void
		logError: (error: unknown) => void
	}
) => Promise<void>

type ExecuteCopySetupLinkToClipboardOptions = {
	deterministic: boolean
	startActions: CopyLinkStartActions | undefined
	locationSearch: string
	origin: string
	seedCache: SeedCache
	showToast: (message: string, options?: ShowToastOptions) => void
	copyTextWithFeedback: CopyFeedbackExecutor
	writeText: ((text: string) => Promise<void>) | undefined
	messages: {
		validationError: string
		copyError: string
		deterministicSuccess: string
		standardSuccess: string
	}
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

export async function executeCopySetupLinkToClipboard({
	deterministic,
	startActions,
	locationSearch,
	origin,
	seedCache,
	showToast,
	copyTextWithFeedback,
	writeText,
	messages
}: ExecuteCopySetupLinkToClipboardOptions): Promise<void> {
	if (!canCopyLink(startActions)) {
		showToast(messages.validationError, { variant: 'error' })
		return
	}

	const searchParams = resolveCopyLinkSearchParams(startActions, locationSearch)
	const baseUrl = buildCanonicalCopyBaseUrl(searchParams, origin)
	const seed = deterministic
		? getDeterministicSeedForQuery(searchParams, seedCache)
		: undefined
	const successMessage = resolveCopyLinkSuccessMessage(deterministic, {
		deterministic: messages.deterministicSuccess,
		standard: messages.standardSuccess
	})

	await copyTextWithFeedback(buildCopyLinkUrl(baseUrl, seed), {
		writeText,
		onSuccess: () => {
			showToast(successMessage)
		},
		onError: () => {
			showToast(messages.copyError, { variant: 'error' })
		},
		logError: console.error
	})
}
