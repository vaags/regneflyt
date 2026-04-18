export async function copyTextWithFeedback(
	text: string,
	options: {
		writeText?: ((value: string) => Promise<void>) | undefined
		onSuccess: () => void
		onError: () => void
		logError?:
			| ((message?: unknown, ...optionalParams: unknown[]) => void)
			| undefined
	}
): Promise<void> {
	const writeText = options.writeText
	if (!writeText) {
		options.logError?.(
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
		options.logError?.('Copy link failed:', error)
		options.onError()
	}
}
