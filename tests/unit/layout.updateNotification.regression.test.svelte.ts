// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import { storageWriteError } from '$lib/stores'
import LayoutHarness from './mocks/LayoutHarness.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	app_description: () => 'Desc',
	app_title: () => 'Regneflyt',
	app_title_full: () => 'Regneflyt Full',
	button_menu: () => 'Menu',
	button_close: () => 'Close',
	button_no: () => 'No',
	button_yes: () => 'Yes',
	cancel_confirm: () => 'Quit?',
	error_boundary_message: () => 'Boundary message',
	error_boundary_reload: () => 'Reload',
	error_boundary_title: () => 'Boundary title',
	heading_puzzles: () => 'Puzzles',
	heading_results: () => 'Results',
	heading_settings: () => 'Settings',
	heading_skill_level: () => 'Skill level',
	quit_confirm_message: () => 'Do you want to quit?',
	sr_open_settings: () => 'Open settings',
	sr_skip_to_content: () => 'Skip to content',
	storage_write_error: () => 'Progress could not be saved.'
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
	toggleDevToolsVisibility: vi.fn(),
	showDevTools: writable(false),
	clearAllProgress: vi.fn(),
	overallSkill: writable(0),
	lastResults: writable(undefined),
	storageWriteError: writable(false)
}))

vi.mock('$lib/components/widgets/UpdateNotification.svelte', async () => {
	const mod = await import('./mocks/MockUpdateNotification.svelte')
	return { default: mod.default }
})

describe('Layout update notification regression', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
		storageWriteError.set(false)
	})

	it('mounts update notification on initial render', async () => {
		const { findByTestId } = render(LayoutHarness)
		expect(await findByTestId('update-notification-mounted')).toBeTruthy()
	})

	it('shows, dismisses, and re-shows storage write warning', async () => {
		const { findByRole, queryByRole } = render(LayoutHarness)

		storageWriteError.set(true)
		const alert = await findByRole('alert')
		expect(alert.textContent).toContain('Progress could not be saved.')

		const closeButton = await findByRole('button', { name: 'Close' })
		await fireEvent.click(closeButton)
		expect(queryByRole('alert')).toBeNull()

		storageWriteError.set(true)
		const alertAgain = await findByRole('alert')
		expect(alertAgain.textContent).toContain('Progress could not be saved.')
	})

	it('sets route-aware page title from layout data', () => {
		render(LayoutHarness, {
			data: {
				pathname: '/settings',
				pageTitleKey: 'settings'
			}
		})

		expect(document.title).toBe('Settings - Regneflyt')
	})

	it('sets quiz page title from layout data', () => {
		render(LayoutHarness, {
			data: {
				pathname: '/quiz',
				pageTitleKey: 'quiz'
			}
		})

		expect(document.title).toBe('Puzzles - Regneflyt')
	})

	it('sets results page title from layout data', () => {
		render(LayoutHarness, {
			data: {
				pathname: '/results',
				pageTitleKey: 'results'
			}
		})

		expect(document.title).toBe('Results - Regneflyt')
	})
})
