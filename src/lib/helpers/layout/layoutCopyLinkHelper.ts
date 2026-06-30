import { customDifficultyId } from '$lib/models/AdaptiveProfile'
import { parseQuizUrlQuery } from '$lib/models/quizQuerySchema'
import { getQuiz } from '$lib/helpers/quiz/quizHelper'
import { buildCopyLinkUrl, buildQuizParams } from '$lib/helpers/urlParamsHelper'
import { getRandomUint32Seed } from '$lib/helpers/seedHelper'

type CopyLinkStartActions = {
	canCopyLink?: (() => boolean) | undefined
	getCopyLinkSearchParams?: (() => URLSearchParams) | undefined
}

export type SeedCache = {
	get(key: string): number | undefined
	set(key: string, value: number): void
}

export type ShowToastOptions = {
	variant?: 'success' | 'error'
}

export type CopyFeedbackExecutor = (
	text: string,
	options: {
		writeText: ((text: string) => Promise<void>) | undefined
		onSuccess: () => void
		onError: () => void
		logError: (message: string, error: unknown) => void
	}
) => Promise<void>

export type CopySetupLinkMessages = {
	validationError: string
	copyError: string
	deterministicSuccess: string
	standardSuccess: string
}

type CopySetupLinkExecutorOptions = {
	getStartActions: () => CopyLinkStartActions | undefined
	seedCache: SeedCache
	showToast: (message: string, options?: ShowToastOptions) => void
	copyTextWithFeedback: CopyFeedbackExecutor
	getWriteText: () => ((text: string) => Promise<void>) | undefined
}

type CopySetupLinkRequest = {
	deterministic?: boolean
	locationSearch: string
	origin: string
	messages: CopySetupLinkMessages
}

export function shouldShowDeterministicCopyLinkAction(search: string): boolean {
	const parsedDifficulty = parseQuizUrlQuery(
		new URLSearchParams(search)
	).difficulty
	return parsedDifficulty === customDifficultyId
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

export function resolveDeterministicSeedForQuery(
	searchParams: URLSearchParams,
	seedCache: SeedCache,
	random?: () => number
): number {
	const parsedSeed = parseQuizUrlQuery(searchParams).seed
	if (parsedSeed !== undefined) return parsedSeed

	const canonicalQueryKey = buildQuizParams(getQuiz(searchParams)).toString()
	const existingSeed = seedCache.get(canonicalQueryKey)
	if (existingSeed !== undefined) return existingSeed

	const generatedSeed = getRandomUint32Seed(random)
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

export function createCopySetupLinkToClipboard({
	getStartActions,
	seedCache,
	showToast,
	copyTextWithFeedback,
	getWriteText
}: CopySetupLinkExecutorOptions) {
	return async function copySetupLinkToClipboard({
		deterministic = false,
		locationSearch,
		origin,
		messages
	}: CopySetupLinkRequest): Promise<void> {
		const startActions = getStartActions()
		const writeText = getWriteText()

		if (!canCopyLink(startActions)) {
			showToast(messages.validationError, { variant: 'error' })
			return
		}

		const searchParams = resolveCopyLinkSearchParams(
			startActions,
			locationSearch
		)
		const baseUrl = buildCanonicalCopyBaseUrl(searchParams, origin)
		const seed = deterministic
			? resolveDeterministicSeedForQuery(searchParams, seedCache)
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
			logError: () => {
				// Errors are surfaced to the user via toast in onError.
			}
		})
	}
}
