import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

type LocalStorageMock = {
	getItem: ReturnType<typeof vi.fn>
	setItem: ReturnType<typeof vi.fn>
}

describe('stores', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.clearAllMocks()
	})

	afterEach(() => {
		delete (globalThis as { window?: Window & typeof globalThis }).window
	})

	function mockWindowWithStorage(initialValue: string | null) {
		const localStorage: LocalStorageMock = {
			getItem: vi.fn(() => initialValue),
			setItem: vi.fn()
		}

		;(globalThis as { window?: Window & typeof globalThis }).window = {
			localStorage
		} as unknown as Window & typeof globalThis

		return localStorage
	}

	it('hydrates adaptiveProfiles from localStorage when present', async () => {
		const storage = mockWindowWithStorage(
			JSON.stringify({
				adaptive: [10, 20, 30, 40],
				custom: [1, 2, 3, 4]
			})
		)

		const { adaptiveProfiles } = await import('../../src/stores')

		expect(get(adaptiveProfiles)).toEqual({
			adaptive: [10, 20, 30, 40],
			custom: [1, 2, 3, 4]
		})
		expect(storage.getItem).toHaveBeenCalledWith(
			'regneflyt.adaptive-profiles.v1'
		)
		expect(storage.setItem).toHaveBeenCalled()
	})

	it('persists updates and reset back to localStorage', async () => {
		const storage = mockWindowWithStorage(null)
		const { adaptiveProfiles } = await import('../../src/stores')

		adaptiveProfiles.update((profiles) => ({
			...profiles,
			adaptive: [5, 6, 7, 8]
		}))

		const updateCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		let payload = JSON.parse(updateCall?.[1] as string) as {
			adaptive: number[]
			custom: number[]
		}
		expect(payload.adaptive).toEqual([5, 6, 7, 8])

		adaptiveProfiles.reset()
		const resetCall =
			storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1]
		payload = JSON.parse(resetCall?.[1] as string) as {
			adaptive: number[]
			custom: number[]
		}
		expect(payload).toEqual({
			adaptive: [0, 0, 0, 0],
			custom: [0, 0, 0, 0]
		})
	})
})
