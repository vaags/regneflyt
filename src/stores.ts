import { writable } from 'svelte/store'
import {
	defaultAdaptiveProfiles,
	defaultAdaptiveSkillMap,
	sanitizeAdaptiveSkillMap,
	type AdaptiveProfiles
} from './models/AdaptiveProfile'

export const highscore = writable<number>(0)

const adaptiveProfilesStorageKey = 'regneflyt.adaptive-profiles.v1'

function getStoredAdaptiveProfiles(): AdaptiveProfiles {
	if (typeof window === 'undefined') return defaultAdaptiveProfiles

	try {
		const raw = window.localStorage.getItem(adaptiveProfilesStorageKey)
		if (!raw) return defaultAdaptiveProfiles

		const parsed = JSON.parse(raw) as Partial<AdaptiveProfiles>
		return {
			adaptive: sanitizeAdaptiveSkillMap(parsed.adaptive),
			custom: sanitizeAdaptiveSkillMap(parsed.custom)
		}
	} catch {
		return defaultAdaptiveProfiles
	}
}

function createAdaptiveProfilesStore() {
	const store = writable<AdaptiveProfiles>(defaultAdaptiveProfiles)

	if (typeof window !== 'undefined') {
		store.set(getStoredAdaptiveProfiles())
		store.subscribe((value) => {
			window.localStorage.setItem(
				adaptiveProfilesStorageKey,
				JSON.stringify(value)
			)
		})
	}

	return {
		subscribe: store.subscribe,
		set: store.set,
		update: store.update,
		reset() {
			store.set({
				adaptive: [...defaultAdaptiveSkillMap],
				custom: [...defaultAdaptiveSkillMap]
			})
		}
	}
}

export const adaptiveProfiles = createAdaptiveProfilesStore()
