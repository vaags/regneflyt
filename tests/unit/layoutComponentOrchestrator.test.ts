import { describe, expect, it, vi } from 'vitest'
import {
	createLayoutComponentLoaders,
	type LayoutSkillDialogComponent,
	type LayoutUpdateNotificationComponent,
	type LayoutSkillDialogHandle,
	type LayoutUpdateNotificationHandle
} from '$lib/helpers/layout/layoutComponentOrchestrator'

describe('createLayoutComponentLoaders', () => {
	function makeOptions(
		overrides: Partial<Parameters<typeof createLayoutComponentLoaders>[0]> = {}
	) {
		return {
			getSkillDialogComponent: () => null,
			setSkillDialogComponent: vi.fn(),
			getUpdateNotificationComponent: () => null,
			setUpdateNotificationComponent: vi.fn(),
			getSkillDialog: () => undefined,
			getUpdateNotification: () => undefined,
			awaitLoaded: vi.fn().mockResolvedValue(undefined),
			...overrides
		}
	}

	describe('ensureSkillDialog', () => {
		it('loads skill dialog component only once', async () => {
			const setSkillDialogComponent = vi.fn()
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { ensureSkillDialog } = createLayoutComponentLoaders(
				makeOptions({
					getSkillDialogComponent: () => null,
					setSkillDialogComponent,
					awaitLoaded
				})
			)

			await ensureSkillDialog()

			expect(setSkillDialogComponent).toHaveBeenCalledOnce()
			expect(awaitLoaded).toHaveBeenCalledOnce()
		})

		it('skips loading when component is already loaded', async () => {
			const mockComponent = {
				_svelte_component: true,
				default: null
			} as unknown as LayoutSkillDialogComponent
			const setSkillDialogComponent = vi.fn()
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { ensureSkillDialog } = createLayoutComponentLoaders(
				makeOptions({
					getSkillDialogComponent: () => mockComponent,
					setSkillDialogComponent,
					awaitLoaded
				})
			)

			await ensureSkillDialog()

			expect(setSkillDialogComponent).not.toHaveBeenCalled()
			expect(awaitLoaded).not.toHaveBeenCalled()
		})
	})

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

	describe('openSkillDialog', () => {
		it('ensures skill dialog is loaded then opens it', async () => {
			const mockHandle: LayoutSkillDialogHandle = { open: vi.fn() }
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { openSkillDialog } = createLayoutComponentLoaders(
				makeOptions({
					getSkillDialogComponent: () => null,
					getSkillDialog: () => mockHandle,
					awaitLoaded
				})
			)

			await openSkillDialog()

			expect(mockHandle.open).toHaveBeenCalledOnce()
		})

		it('does not call open when handle is undefined', async () => {
			const awaitLoaded = vi.fn().mockResolvedValue(undefined)

			const { openSkillDialog } = createLayoutComponentLoaders(
				makeOptions({
					getSkillDialogComponent: () => null,
					getSkillDialog: () => undefined,
					awaitLoaded
				})
			)

			await openSkillDialog()

			expect(awaitLoaded).toHaveBeenCalledOnce()
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
