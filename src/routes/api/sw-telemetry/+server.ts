import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

type TelemetryPayload = {
	event?: string
	details?: Record<string, unknown>
	timestamp?: string
	source?: 'service-worker' | 'client'
}

const MAX_EVENT_LENGTH = 80
const MAX_DETAILS_BYTES = 4 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60

const rateLimitBucket = new Map<
	string,
	{ windowStart: number; count: number }
>()

function getSafeClientAddress(getClientAddress: () => string): string {
	try {
		return getClientAddress()
	} catch {
		return 'unknown'
	}
}

function isRateLimited(clientAddress: string): boolean {
	const now = Date.now()

	for (const [key, value] of rateLimitBucket) {
		if (now - value.windowStart > RATE_LIMIT_WINDOW_MS) {
			rateLimitBucket.delete(key)
		}
	}

	const current = rateLimitBucket.get(clientAddress)
	if (!current) {
		rateLimitBucket.set(clientAddress, { windowStart: now, count: 1 })
		return false
	}

	if (now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
		rateLimitBucket.set(clientAddress, { windowStart: now, count: 1 })
		return false
	}

	if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
		return true
	}

	current.count += 1
	rateLimitBucket.set(clientAddress, current)
	return false
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: TelemetryPayload | undefined
	const clientAddress = getSafeClientAddress(getClientAddress)

	if (isRateLimited(clientAddress)) {
		return json({ ok: false, error: 'rate-limited' }, { status: 429 })
	}

	try {
		body = (await request.json()) as TelemetryPayload
	} catch {
		return json({ ok: false, error: 'invalid-json' }, { status: 400 })
	}

	if (!body?.event || typeof body.event !== 'string') {
		return json({ ok: false, error: 'missing-event' }, { status: 400 })
	}

	const event = body.event.trim()
	if (!event || event.length > MAX_EVENT_LENGTH) {
		return json({ ok: false, error: 'invalid-event' }, { status: 400 })
	}

	const source =
		body.source === 'service-worker' || body.source === 'client'
			? body.source
			: 'unknown'

	let details: Record<string, unknown> = {}
	if (body.details && typeof body.details === 'object') {
		details = body.details
	}

	const serializedDetails = JSON.stringify(details)
	if (serializedDetails.length > MAX_DETAILS_BYTES) {
		return json({ ok: false, error: 'details-too-large' }, { status: 413 })
	}

	console.warn('[sw-telemetry]', {
		event,
		source,
		timestamp: body.timestamp ?? new Date().toISOString(),
		ip: clientAddress,
		details
	})

	return json({ ok: true }, { status: 202 })
}
