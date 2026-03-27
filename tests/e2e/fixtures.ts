import type { Page } from '@playwright/test'

export async function resetClientState(page: Page) {
	if (page.isClosed()) return
	await page
		.evaluate(async () => {
			const safe = async (work: () => Promise<void> | void) => {
				try {
					await work()
				} catch {
					return
				}
			}

			const clearIndexedDb = async () => {
				if (!('indexedDB' in window)) return
				const listDatabases = (
					indexedDB as IDBFactory & {
						databases?: () => Promise<Array<{ name?: string | null }>>
					}
				).databases
				if (typeof listDatabases !== 'function') return
				const dbs = await listDatabases()
				await Promise.all(
					dbs
						.map((db) => db?.name ?? null)
						.filter((name): name is string => !!name)
						.map(
							(name) =>
								new Promise<void>((resolve) => {
									const request = indexedDB.deleteDatabase(name)
									request.onsuccess = () => resolve()
									request.onerror = () => resolve()
									request.onblocked = () => resolve()
								})
						)
				)
			}

			const clearCacheStorage = async () => {
				if (!('caches' in window)) return
				const keys = await caches.keys()
				await Promise.all(keys.map((key) => caches.delete(key)))
			}

			const clearServiceWorkers = async () => {
				if (!('serviceWorker' in navigator)) return
				const registrations = await navigator.serviceWorker.getRegistrations()
				await Promise.all(
					registrations.map((registration) => registration.unregister())
				)
			}

			await safe(() => {
				localStorage.clear()
				sessionStorage.clear()
			})
			await safe(() => clearIndexedDb())
			await safe(() => clearCacheStorage())
			await safe(() => clearServiceWorkers())
		})
		.catch(() => undefined)
}
