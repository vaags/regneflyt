import { describe, expect, it } from 'vitest'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { adaptiveTuningDescriptions } from '$lib/models/adaptiveTuningDescriptions'

function collectLeafPaths(value: unknown, prefix = ''): string[] {
	if (typeof value === 'number') return [prefix]
	if (typeof value === 'string') return [prefix]
	if (Array.isArray(value)) return [prefix]
	if (typeof value !== 'object' || value === null) return []

	return Object.entries(value).flatMap(([key, nestedValue]) =>
		collectLeafPaths(nestedValue, prefix.length > 0 ? `${prefix}.${key}` : key)
	)
}

describe('adaptiveTuningDescriptions', () => {
	it('describes every active numeric or tuple tuning leaf', () => {
		const tuningLeafPaths = collectLeafPaths(adaptiveTuning)
		const descriptionLeafPaths = collectLeafPaths(adaptiveTuningDescriptions)

		expect(descriptionLeafPaths.sort()).toEqual(tuningLeafPaths.sort())
	})
})
