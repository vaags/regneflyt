// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import LayoutHarness from './mocks/LayoutHarness.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	app_description: () => 'Desc',
	app_title: () => 'Regneflyt',
	app_title_full: () => 'Regneflyt Full',
	error_boundary_message: () => 'Boundary message',
	error_boundary_reload: () => 'Reload',
	error_boundary_title: () => 'Boundary title',
	heading_settings: () => 'Settings',
	heading_skill_level: () => 'Skill level',
	sr_open_settings: () => 'Open settings',
	sr_skip_to_content: () => 'Skip to content'
}))

vi.mock('$lib/paraglide/runtime.js', () => ({
	getLocale: () => 'en'
}))

vi.mock('$lib/helpers/localeHelper', () => ({
	getLocaleNames: () => ({ en: 'English' }),
	switchLocale: (locale: string) => locale
}))

vi.mock('$lib/stores', () => ({
	theme: writable('system'),
	applyTheme: vi.fn(),
	clearDevStorage: vi.fn(),
	overallSkill: writable(0),
	lastResults: writable(undefined)
}))

vi.mock('$lib/components/widgets/UpdateNotification.svelte', async () => {
	const mod = await import('./mocks/MockUpdateNotification.svelte')
	return { default: mod.default }
})

describe('Layout update notification regression', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('mounts update notification on initial render', async () => {
		const { findByTestId } = render(LayoutHarness)
		expect(await findByTestId('update-notification-mounted')).toBeTruthy()
	})
})
