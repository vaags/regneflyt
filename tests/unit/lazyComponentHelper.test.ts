import { describe, expect, it, vi } from 'vitest'
import type { Component } from 'svelte'
import { ensureLazyComponentLoaded } from '$lib/helpers/lazyComponentHelper'

describe('ensureLazyComponentLoaded', () => {
	it('loads, assigns, and awaits post-load callback when component is not loaded', async () => {
		const loadedComponent = (() => null) as unknown as Component<
			{ locale?: string | undefined },
			{ open: () => void }
		>
		const load = vi.fn(async () => ({ default: loadedComponent }))
		const assign = vi.fn()
		const onLoaded = vi.fn(async () => undefined)

		await ensureLazyComponentLoaded(null, load, assign, onLoaded)

		expect(load).toHaveBeenCalledTimes(1)
		expect(assign).toHaveBeenCalledTimes(1)
		expect(assign).toHaveBeenCalledWith(loadedComponent)
		expect(onLoaded).toHaveBeenCalledTimes(1)
	})

	it('does nothing when component is already loaded', async () => {
		const existingComponent = (() => null) as unknown as Component<
			{ locale?: string | undefined },
			{ open: () => void }
		>
		const load = vi.fn(async () => ({ default: existingComponent }))
		const assign = vi.fn()
		const onLoaded = vi.fn(async () => undefined)

		await ensureLazyComponentLoaded(existingComponent, load, assign, onLoaded)

		expect(load).not.toHaveBeenCalled()
		expect(assign).not.toHaveBeenCalled()
		expect(onLoaded).not.toHaveBeenCalled()
	})
})
