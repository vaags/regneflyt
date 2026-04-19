import { describe, expect, it } from 'vitest'
import {
	normalizeLayoutPageTitleKey,
	getLayoutPageTitle,
	getStickyGlobalNavTransitionName,
	shouldShowDeterministicCopyLinkAction
} from '$lib/helpers/layout/layoutNavigationHelper'
import { customAdaptiveDifficultyId } from '$lib/models/AdaptiveProfile'

const messages = {
	appTitleFull: 'Regneflyt Full',
	appTitle: 'Regneflyt',
	quizTitle: 'Puzzles',
	resultsTitle: 'Results',
	settingsTitle: 'Settings'
}

describe('layoutHelper', () => {
	it('coerces unknown page-title keys to settings for fallback parity', () => {
		expect(normalizeLayoutPageTitleKey('home')).toBe('home')
		expect(normalizeLayoutPageTitleKey('default')).toBe('default')
		expect(normalizeLayoutPageTitleKey('unknown')).toBe('settings')
	})

	it('returns full app title for home/default pages', () => {
		expect(getLayoutPageTitle('home', messages)).toBe('Regneflyt Full')
		expect(getLayoutPageTitle('default', messages)).toBe('Regneflyt Full')
	})

	it('returns route-specific title suffixes for section pages', () => {
		expect(getLayoutPageTitle('quiz', messages)).toBe('Puzzles - Regneflyt')
		expect(getLayoutPageTitle('results', messages)).toBe('Results - Regneflyt')
		expect(getLayoutPageTitle('settings', messages)).toBe(
			'Settings - Regneflyt'
		)
	})

	it('maps supported paths to sticky global nav transition names', () => {
		expect(getStickyGlobalNavTransitionName('/', false)).toBe(
			'sticky-global-nav-menu'
		)
		expect(getStickyGlobalNavTransitionName('/results', false)).toBe(
			'sticky-global-nav-results'
		)
		expect(getStickyGlobalNavTransitionName('/settings', false)).toBe(
			'sticky-global-nav-settings'
		)
		expect(getStickyGlobalNavTransitionName('/quiz', false)).toBeUndefined()
	})

	it('suppresses sticky global nav transition name when requested', () => {
		expect(getStickyGlobalNavTransitionName('/', true)).toBeUndefined()
	})

	it('toggles deterministic copy-link action only for custom adaptive difficulty', () => {
		expect(
			shouldShowDeterministicCopyLinkAction(
				`?difficulty=${customAdaptiveDifficultyId}`
			)
		).toBe(true)
		expect(shouldShowDeterministicCopyLinkAction('?difficulty=1')).toBe(false)
		expect(shouldShowDeterministicCopyLinkAction('')).toBe(false)
	})
})
