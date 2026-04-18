export function safeMsg(fn: () => string, fallback: string): string {
	try {
		return fn()
	} catch {
		return fallback
	}
}
