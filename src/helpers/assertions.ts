const invariantPrefix = '[Invariant]'

export function invariant(
	condition: unknown,
	message: string
): asserts condition {
	if (!condition) throw new Error(`${invariantPrefix} ${message}`)
}

export function assertNever(value: never, message: string): never {
	throw new Error(`${invariantPrefix} ${message}: ${String(value)}`)
}
