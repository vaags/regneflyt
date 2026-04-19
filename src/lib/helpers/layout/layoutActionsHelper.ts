import type { Locale } from '$lib/paraglide/runtime.js'
import type { StickyGlobalNavStartActions } from '$lib/contexts/stickyGlobalNavContext'

// ============================================================================
// Clipboard Copy (from layoutClipboardHelper.ts)
// ============================================================================

export async function copyTextWithFeedback(
	text: string,
	options: {
		writeText?: ((value: string) => Promise<void>) | undefined
		onSuccess: () => void
		onError: () => void
		logError: (message: string, error: unknown) => void
	}
): Promise<void> {
	const writeText = options.writeText
	if (!writeText) {
		options.logError(
			'Copy link failed:',
			new Error('Clipboard API unavailable')
		)
		options.onError()
		return
	}

	try {
		await writeText(text)
		options.onSuccess()
	} catch (error) {
		options.logError('Copy link failed:', error)
		options.onError()
	}
}

// ============================================================================
// Sticky Start Actions (from layoutStartActionsHelper.ts)
// ============================================================================

export function registerStickyStartActions(
	actions: StickyGlobalNavStartActions,
	options: {
		getCurrentToken: () => number
		setToken: (token: number) => void
		setActions: (value: StickyGlobalNavStartActions | undefined) => void
		resetToken: () => void
	}
): () => void {
	const token = options.getCurrentToken() + 1
	options.setToken(token)
	options.setActions(actions)

	return () => {
		if (options.getCurrentToken() !== token) return
		options.setActions(undefined)
		options.resetToken()
	}
}

export function resolveStickyStartAction(
	startActions: StickyGlobalNavStartActions | undefined,
	fallback: () => void
): () => void {
	return startActions?.onStart ?? fallback
}

export function resolveStickyReplayAction(
	startActions: StickyGlobalNavStartActions | undefined,
	hasReplayableResults: boolean,
	fallback: () => void
): (() => void) | undefined {
	if (startActions?.onReplay) return startActions.onReplay
	return hasReplayableResults ? fallback : undefined
}

// ============================================================================
// Settings Context (from layoutSettingsContextHelper.ts)
// ============================================================================

export function switchLocaleWithOverride(
	nextLocale: Locale,
	switchLocale: (locale: Locale) => Locale | undefined,
	setLocaleOverride: (locale: Locale) => void
): Locale | undefined {
	const newLocale = switchLocale(nextLocale)
	if (!newLocale) return undefined
	setLocaleOverride(newLocale)
	return newLocale
}

export async function simulateUpdateNotificationAfterEnsure(
	ensureUpdateNotification: () => Promise<void>,
	showUpdateNotification: () => void
): Promise<void> {
	await ensureUpdateNotification()
	showUpdateNotification()
}
