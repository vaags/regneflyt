import type { Component } from 'svelte'
import type { Locale } from '$lib/paraglide/runtime.js'
import { ensureLazyComponentLoaded } from '$lib/helpers/lazyComponentHelper'

export type LayoutUpdateNotificationHandle = { showNotification: () => void }

export type LayoutUpdateNotificationComponent = Component<
	{ locale?: Locale | undefined },
	LayoutUpdateNotificationHandle
>

type LayoutComponentLoaderOptions = {
	getUpdateNotificationComponent: () => LayoutUpdateNotificationComponent | null
	setUpdateNotificationComponent: (
		component: LayoutUpdateNotificationComponent
	) => void
	getUpdateNotification: () => LayoutUpdateNotificationHandle | undefined
	awaitLoaded: () => Promise<void>
}

type LayoutComponentLoaders = {
	ensureUpdateNotification: () => Promise<void>
	showUpdateNotification: () => Promise<void>
}

export function createLayoutComponentLoaders({
	getUpdateNotificationComponent,
	setUpdateNotificationComponent,
	getUpdateNotification,
	awaitLoaded
}: LayoutComponentLoaderOptions): LayoutComponentLoaders {
	async function ensureUpdateNotification(): Promise<void> {
		await ensureLazyComponentLoaded(
			getUpdateNotificationComponent(),
			() => import('$lib/components/widgets/UpdateNotification.svelte'),
			(component) => {
				setUpdateNotificationComponent(component)
			},
			awaitLoaded
		)
	}

	async function showUpdateNotification(): Promise<void> {
		await ensureUpdateNotification()
		getUpdateNotification()?.showNotification()
	}

	return {
		ensureUpdateNotification,
		showUpdateNotification
	}
}
