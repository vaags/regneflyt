// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	cleanup,
	fireEvent,
	render,
	waitFor,
	within
} from '@testing-library/svelte'
import { writable } from 'svelte/store'
import LayoutHarness from './mocks/LayoutHarness.svelte'
import { quizQueryUpdatedEventName } from '$lib/helpers/urlParamsHelper'

const { mockActiveToast, mockStorageWriteError, mockDismissToast } = vi.hoisted(
	() => {
		type Subscriber<T> = (value: T) => void
		type Invalidate = () => void

		const createStore = <T>(initialValue: T) => {
			let value = initialValue
			const subscribers = new Set<[Subscriber<T>, Invalidate]>()

			return {
				subscribe(run: Subscriber<T>, invalidate: Invalidate = () => {}) {
					run(value)
					subscribers.add([run, invalidate])
					return () =>
						subscribers.forEach((entry) => {
							if (entry[0] === run && entry[1] === invalidate) {
								subscribers.delete(entry)
							}
						})
				},
				set(nextValue: T) {
					value = nextValue
					subscribers.forEach(([, invalidate]) => invalidate())
					subscribers.forEach(([run]) => run(value))
				}
			}
		}

		const mockActiveToast = createStore<unknown>(undefined)
		const mockStorageWriteError = createStore<boolean>(false)
		const mockDismissToast = vi.fn(() => mockActiveToast.set(undefined))

		return {
			mockActiveToast,
			mockStorageWriteError,
			mockDismissToast
		}
	}
)

function setActiveToast(value: unknown) {
	mockActiveToast.set(value)
}

vi.mock('$lib/paraglide/messages.js', () => ({
	app_description: () => 'Desc',
	app_title: () => 'Regneflyt',
	app_title_full: () => 'Regneflyt Full',
	button_start: () => 'Start',
	button_replay: () => 'Replay previous quiz',
	button_copy_link: () => 'Copy setup link',
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
	label_copy_link_same_puzzles: () => 'Fixed puzzle order',
	quit_confirm_message: () => 'Do you want to quit?',
	sr_open_settings: () => 'Open settings',
	sr_skip_to_content: () => 'Skip to content',
	storage_write_error: () => 'Progress could not be saved.',
	toast_copy_link_deterministic_success: () =>
		'Setup link with fixed puzzle order copied.',
	toast_copy_link_error: () => 'Could not copy link.',
	toast_copy_link_validation_error: () =>
		'Please fix validation errors before copying the setup link.',
	toast_copy_link_success: () => 'Setup link copied.'
}))

vi.mock('$lib/paraglide/runtime.js', () => ({
	getLocale: () => 'en'
}))

vi.mock('$lib/helpers/localeHelper', () => ({
	getLocaleNames: () => ({ en: 'English' }),
	switchLocale: (locale: string) => locale
}))

vi.mock('$lib/stores', () => {
	return {
		theme: writable('system'),
		applyTheme: vi.fn(),
		toggleDevToolsVisibility: vi.fn(),
		showDevTools: writable(false),
		clearAllProgress: vi.fn(),
		showToast: vi.fn(),
		dismissToast: mockDismissToast,
		activeToast: mockActiveToast,
		overallSkill: writable(0),
		lastResults: writable(undefined),
		storageWriteError: mockStorageWriteError
	}
})

vi.mock('$lib/components/widgets/UpdateNotification.svelte', async () => {
	const mod = await import('./mocks/MockUpdateNotification.svelte')
	return { default: mod.default }
})

describe('Layout update notification regression', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
		mockStorageWriteError.set(false)
		setActiveToast(undefined)
	})

	it('mounts update notification on initial render', async () => {
		const { findByTestId } = render(LayoutHarness)
		expect(await findByTestId('update-notification-mounted')).toBeTruthy()
	})

	it('shows, dismisses, and re-shows storage write warning', async () => {
		const { findByRole, queryByRole } = render(LayoutHarness)

		mockStorageWriteError.set(true)
		const alert = await findByRole('alert')
		expect(alert.textContent).toContain('Progress could not be saved.')

		const closeButton = await findByRole('button', { name: 'Close' })
		await fireEvent.click(closeButton)
		expect(queryByRole('alert')).toBeNull()

		mockStorageWriteError.set(true)
		const alertAgain = await findByRole('alert')
		expect(alertAgain.textContent).toContain('Progress could not be saved.')
	})

	it('renders and wires dismiss for global toast from activeToast store', async () => {
		const { findByTestId } = render(LayoutHarness)

		setActiveToast({
			id: 1,
			message: 'Global toast message',
			variant: 'error',
			testId: 'layout-global-toast'
		})

		const toast = await findByTestId('layout-global-toast')
		expect(toast.textContent).toContain('Global toast message')

		await fireEvent.click(within(toast).getByRole('button', { name: 'Close' }))
		expect(mockDismissToast).toHaveBeenCalledTimes(1)
	})

	it('sets route-aware page title from layout data', () => {
		render(LayoutHarness, {
			data: {
				pathname: '/settings',
				search: '',
				pageTitleKey: 'settings',
				locale: 'en'
			}
		})

		expect(document.title).toBe('Settings - Regneflyt')
	})

	it('sets quiz page title from layout data', () => {
		render(LayoutHarness, {
			data: {
				pathname: '/quiz',
				search: '',
				pageTitleKey: 'quiz',
				locale: 'en'
			}
		})

		expect(document.title).toBe('Puzzles - Regneflyt')
	})

	it('sets results page title from layout data', () => {
		render(LayoutHarness, {
			data: {
				pathname: '/results',
				search: '',
				pageTitleKey: 'results',
				locale: 'en'
			}
		})

		expect(document.title).toBe('Results - Regneflyt')
	})

	it('switches copy link control mode when difficulty query changes', async () => {
		const { findByTestId, queryByTestId } = render(LayoutHarness, {
			data: {
				pathname: '/',
				search: '?difficulty=1',
				pageTitleKey: 'home',
				locale: 'en'
			}
		})

		expect(await findByTestId('btn-copy-link')).toBeTruthy()
		expect(queryByTestId('btn-copy-link-toggle')).toBeNull()

		window.dispatchEvent(
			new CustomEvent(quizQueryUpdatedEventName, {
				detail: { search: '?difficulty=0' }
			})
		)

		await waitFor(() => {
			expect(queryByTestId('btn-copy-link-toggle')).toBeTruthy()
		})

		window.dispatchEvent(
			new CustomEvent(quizQueryUpdatedEventName, {
				detail: { search: '?difficulty=1' }
			})
		)

		await waitFor(() => {
			expect(queryByTestId('btn-copy-link-toggle')).toBeNull()
		})
	})
})
