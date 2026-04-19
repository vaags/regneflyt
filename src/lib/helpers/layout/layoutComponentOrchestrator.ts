import type { Component } from 'svelte'
import type { Locale } from '$lib/paraglide/runtime.js'
import { ensureLazyComponentLoaded } from '$lib/helpers/lazyComponentHelper'

export type LayoutSkillDialogHandle = { open: () => void }
export type LayoutUpdateNotificationHandle = { showNotification: () => void }

export type LayoutSkillDialogComponent = Component<
	{ locale?: Locale | undefined },
	LayoutSkillDialogHandle
>

export type LayoutUpdateNotificationComponent = Component<
	{ locale?: Locale | undefined },
	LayoutUpdateNotificationHandle
>

type LayoutComponentLoaderOptions = {
	getSkillDialogComponent: () => LayoutSkillDialogComponent | null
	setSkillDialogComponent: (component: LayoutSkillDialogComponent) => void
	getUpdateNotificationComponent: () => LayoutUpdateNotificationComponent | null
	setUpdateNotificationComponent: (
		component: LayoutUpdateNotificationComponent
	) => void
	getSkillDialog: () => LayoutSkillDialogHandle | undefined
	getUpdateNotification: () => LayoutUpdateNotificationHandle | undefined
	awaitLoaded: () => Promise<void>
}

export function createLayoutComponentLoaders({
	getSkillDialogComponent,
	setSkillDialogComponent,
	getUpdateNotificationComponent,
	setUpdateNotificationComponent,
	getSkillDialog,
	getUpdateNotification,
	awaitLoaded
}: LayoutComponentLoaderOptions) {
	async function ensureSkillDialog() {
		await ensureLazyComponentLoaded(
			getSkillDialogComponent(),
			() => import('$lib/components/dialogs/SkillDialogComponent.svelte'),
			(component) => {
				setSkillDialogComponent(component)
			},
			awaitLoaded
		)
	}

	async function ensureUpdateNotification() {
		await ensureLazyComponentLoaded(
			getUpdateNotificationComponent(),
			() => import('$lib/components/widgets/UpdateNotification.svelte'),
			(component) => {
				setUpdateNotificationComponent(component)
			},
			awaitLoaded
		)
	}

	async function openSkillDialog() {
		await ensureSkillDialog()
		getSkillDialog()?.open()
	}

	async function showUpdateNotification() {
		await ensureUpdateNotification()
		getUpdateNotification()?.showNotification()
	}

	return {
		ensureSkillDialog,
		ensureUpdateNotification,
		openSkillDialog,
		showUpdateNotification
	}
}
