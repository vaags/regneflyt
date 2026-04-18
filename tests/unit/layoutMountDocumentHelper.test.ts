import { describe, expect, it, vi } from 'vitest'
import { setupLayoutMountDocument } from '$lib/helpers/layout/layoutMountDocumentHelper'

describe('setupLayoutMountDocument', () => {
	it('schedules initial-load class removal across two animation frames', () => {
		const remove = vi.fn()
		const requestAnimationFrameFn = vi
			.fn<(callback: () => void) => number>()
			.mockImplementation((callback) => {
				callback()
				return 1
			})

		setupLayoutMountDocument(
			{
				body: { classList: { remove } },
				documentElement: { style: { setProperty: vi.fn() } }
			},
			requestAnimationFrameFn,
			200,
			100
		)

		expect(requestAnimationFrameFn).toHaveBeenCalledTimes(2)
		expect(remove).toHaveBeenCalledWith('initial-load')
	})

	it('sets theme and page transition css variables', () => {
		const setProperty = vi.fn()

		setupLayoutMountDocument(
			{
				body: { classList: { remove: vi.fn() } },
				documentElement: { style: { setProperty } }
			},
			(callback) => {
				callback()
				return 1
			},
			180,
			90
		)

		expect(setProperty).toHaveBeenCalledWith('--theme-transition-ms', '180ms')
		expect(setProperty).toHaveBeenCalledWith('--page-transition-ms', '90ms')
	})

	it('supports overriding initial-load class token', () => {
		const remove = vi.fn()

		setupLayoutMountDocument(
			{
				body: { classList: { remove } },
				documentElement: { style: { setProperty: vi.fn() } }
			},
			(callback) => {
				callback()
				return 1
			},
			200,
			100,
			'booting'
		)

		expect(remove).toHaveBeenCalledWith('booting')
	})
})
