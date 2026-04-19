import { describe, expect, it, vi } from 'vitest'
import {
	createLayoutComponentLoaders,
	type LayoutUpdateNotificationComponent,
	type LayoutUpdateNotificationHandle
} from '$lib/helpers/layout/layoutComponentOrchestrator'

describe('createLayoutComponentLoaders', () => {
	function makeOptions(
		overrides: Partial<Parameters<typeof createLayoutComponentLoaders>[0]> = {}
	) {
		return {
			getUpdateNotificationComponent: () => null,
			setUpdateNotificationComponent: vi.fn(),
			getUpdateNotification: () => undefined,
			awaitLoaded: vi.fn().mockResolvedValue(undefined),
			...overrides
		}
	}

	describe('ensureUpdateNotification', () => {
		it('loads update notification component only once', async () => {
			const setUpdateNotificationComponent = vi.fn()
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { ensureUpdateNotification } = createLayoutComponentLoaders(
				makeOptions({
					getUpdateNotificationComponent: () => null,
					setUpdateNotificationComponent,
					awaitLoaded
				})
			)

			await ensureUpdateNotification()

			expect(setUpdateNotificationComponent).toHaveBeenCalledOnce()
			expect(awaitLoaded).toHaveBeenCalledOnce()
		})

		it('skips loading when component is already loaded', async () => {
			const mockComponent = {
				_svelte_component: true,
				default: null
			} as unknown as LayoutUpdateNotificationComponent
			const setUpdateNotificationComponent = vi.fn()
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { ensureUpdateNotification } = createLayoutComponentLoaders(
				makeOptions({
					getUpdateNotificationComponent: () => mockComponent,
					setUpdateNotificationComponent,
					awaitLoaded
				})
			)

			await ensureUpdateNotification()

			expect(setUpdateNotificationComponent).not.toHaveBeenCalled()
			expect(awaitLoaded).not.toHaveBeenCalled()
		})
	})

	describe('showUpdateNotification', () => {
		it('ensures update notification is loaded then shows it', async () => {
			const mockHandle: LayoutUpdateNotificationHandle = {
				showNotification: vi.fn()
			}
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { showUpdateNotification } = createLayoutComponentLoaders(
				makeOptions({
					getUpdateNotificationComponent: () => null,
					getUpdateNotification: () => mockHandle,
					awaitLoaded
				})
			)

			await showUpdateNotification()

			expect(mockHandle.showNotification).toHaveBeenCalledOnce()
		})

		it('does not call showNotification when handle is undefined', async () => {
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { showUpdateNotification } = createLayoutComponentLoaders(
				makeOptions({
					getUpdateNotificationComponent: () => null,
					getUpdateNotification: () => undefined,
					awaitLoaded
				})
			)

			await showUpdateNotification()

			expect(awaitLoaded).toHaveBeenCalledOnce()
		})
	})
})
