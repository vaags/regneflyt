import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	getInitialLoadTransitionConfig,
	noTransitionDuration,
	scheduleInitialLoadTransitionEnable,
	shouldAllowEntryTransitions,
	shouldAllowInitialTransitions
} from '#lib/helpers/initialLoadTransitionHelper.ts'

describe('initialLoadTransitionHelper', () => {
	afterEach(() => {
		delete (globalThis as { window?: Window & typeof globalThis }).window
		delete (globalThis as { document?: Document }).document
		vi.restoreAllMocks()
	})

	describe('shouldAllowInitialTransitions', () => {
		it('returns true when document is undefined (SSR)', () => {
			delete (globalThis as { document?: Document }).document
			expect(shouldAllowInitialTransitions()).toBe(true)
		})

		it('returns false when body has initial-load class', () => {
			const globalScope = globalThis as { document?: Document }
			globalScope.document = {
				body: { classList: { contains: () => true } }
			} as unknown as Document
			expect(shouldAllowInitialTransitions()).toBe(false)
		})

		it('returns true when body does not have initial-load class', () => {
			const globalScope = globalThis as { document?: Document }
			globalScope.document = {
				body: { classList: { contains: () => false } }
			} as unknown as Document
			expect(shouldAllowInitialTransitions()).toBe(true)
		})
	})

	describe('scheduleInitialLoadTransitionEnable', () => {
		it('returns undefined and schedules nothing when already enabled', () => {
			const onEnable = vi.fn()
			const cleanup = scheduleInitialLoadTransitionEnable(true, onEnable)
			expect(cleanup).toBeUndefined()
			expect(onEnable).not.toHaveBeenCalled()
		})

		it('returns undefined when window is not available', () => {
			delete (globalThis as { window?: Window & typeof globalThis }).window
			const onEnable = vi.fn()
			const cleanup = scheduleInitialLoadTransitionEnable(false, onEnable)
			expect(cleanup).toBeUndefined()
		})

		it('schedules a RAF and returns a cleanup that cancels it', () => {
			const requestAnimationFrame = vi.fn(() => 42)
			const cancelAnimationFrame = vi.fn()
			const globalScope = globalThis as {
				window?: Window & typeof globalThis
			}
			globalScope.window = {
				requestAnimationFrame,
				cancelAnimationFrame
			} as unknown as Window & typeof globalThis

			const onEnable = vi.fn()
			const cleanup = scheduleInitialLoadTransitionEnable(false, onEnable)

			expect(requestAnimationFrame).toHaveBeenCalledWith(onEnable)
			expect(cleanup).toBeTypeOf('function')

			cleanup!()
			expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
		})
	})

	describe('getInitialLoadTransitionConfig', () => {
		const activeConfig = { duration: 300, easing: 'ease' }

		it('returns the active config when enabled', () => {
			expect(getInitialLoadTransitionConfig(true, activeConfig)).toBe(
				activeConfig
			)
		})

		it('returns noTransitionDuration when disabled', () => {
			expect(getInitialLoadTransitionConfig(false, activeConfig)).toBe(
				noTransitionDuration
			)
		})
	})

	describe('shouldAllowEntryTransitions', () => {
		it('allows entry transitions outside cold boot and route navigation', () => {
			expect(shouldAllowEntryTransitions(true, false)).toBe(true)
		})

		it('disables entry transitions during cold boot', () => {
			expect(shouldAllowEntryTransitions(false, false)).toBe(false)
		})

		it('disables entry transitions while a route navigation is in flight', () => {
			expect(shouldAllowEntryTransitions(true, true)).toBe(false)
		})

		it('disables entry transitions when both cold boot and navigation apply', () => {
			expect(shouldAllowEntryTransitions(false, true)).toBe(false)
		})
	})
})
