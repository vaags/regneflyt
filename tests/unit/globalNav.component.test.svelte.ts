// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { button_replay, button_start } from '$lib/paraglide/messages.js'
import type { Locale } from '$lib/paraglide/runtime.js'
import type { StickyGlobalNavQuizControls } from '$lib/contexts/stickyGlobalNavContext'
import GlobalNav from '$lib/components/layout/GlobalNav.svelte'

describe('GlobalNav', () => {
	afterEach(() => {
		cleanup()
	})

	type GlobalNavProps = {
		locale: Locale
		pathname: string
		mode?: 'default' | 'quiz'
		quizControls?: StickyGlobalNavQuizControls | undefined
		retainQuizControls?: boolean
		transitionName?: string | undefined
		onStart: () => void
		onReplay?: (() => void) | undefined
		onNavigateMenu: () => void
		onNavigateResults: () => void
		onNavigateSettings: () => void
		onCopyLink: () => void | Promise<void>
		onCopyDeterministicLink?: (() => void | Promise<void>) | undefined
	}

	function renderGlobalNav(overrides: Partial<GlobalNavProps> = {}) {
		return render(GlobalNav, {
			props: {
				locale: 'nb',
				pathname: '/',
				onStart: vi.fn(),
				onNavigateMenu: vi.fn(),
				onNavigateResults: vi.fn(),
				onNavigateSettings: vi.fn(),
				onCopyLink: vi.fn(),
				...overrides
			}
		})
	}

	it('renders only the primary start button when replay action is absent', () => {
		const { getByTestId, queryByTestId } = renderGlobalNav()

		expect(getByTestId('btn-start').textContent).toBe(
			button_start({}, { locale: 'nb' })
		)
		expect(queryByTestId('btn-start-toggle')).toBeNull()
	})

	it('calls onStart when the primary start button is clicked', async () => {
		const onStart = vi.fn()
		const { getByTestId } = renderGlobalNav({ onStart })

		await fireEvent.click(getByTestId('btn-start'))
		expect(onStart).toHaveBeenCalledOnce()
	})

	it('renders split mode and calls onReplay from the secondary action', async () => {
		const onStart = vi.fn()
		const onReplay = vi.fn()
		const { getByTestId, findByTestId } = renderGlobalNav({
			onStart,
			onReplay
		})

		await fireEvent.click(getByTestId('btn-start-toggle'))
		const secondaryAction = await findByTestId('btn-start-secondary')

		expect(secondaryAction.textContent).toBe(
			button_replay({}, { locale: 'nb' })
		)

		await fireEvent.click(secondaryAction)
		expect(onReplay).toHaveBeenCalledOnce()
		expect(onStart).not.toHaveBeenCalled()
	})

	it('uses locale specific start and replay labels', async () => {
		const locale = 'es'
		const { getByTestId, findByTestId } = renderGlobalNav({
			locale,
			onReplay: vi.fn()
		})

		expect(getByTestId('btn-start').textContent).toBe(
			button_start({}, { locale })
		)
		expect(getByTestId('btn-start-toggle').getAttribute('aria-label')).toBe(
			button_replay({}, { locale })
		)

		await fireEvent.click(getByTestId('btn-start-toggle'))
		expect((await findByTestId('btn-start-secondary')).textContent).toBe(
			button_replay({}, { locale })
		)
	})

	it('hides the top action row in quiz mode while keeping bottom navigation', () => {
		const { queryByTestId, getByTestId } = renderGlobalNav({
			mode: 'quiz',
			quizControls: {
				value: undefined,
				disabled: false,
				disabledNext: true,
				nextButtonColor: 'gray' as const,
				onValueChange: vi.fn(),
				onCompletePuzzle: vi.fn()
			}
		})

		expect(queryByTestId('btn-start')).toBeNull()
		expect(queryByTestId('btn-copy-link')).toBeNull()
		expect(getByTestId('numpad-next')).toBeTruthy()
		expect(getByTestId('btn-menu')).toBeTruthy()
		expect(getByTestId('btn-results')).toBeTruthy()
		expect(getByTestId('btn-global-settings')).toBeTruthy()
	})

	it('keeps the top action row hidden while quiz controls are still registering', () => {
		const { queryByTestId, getByTestId } = renderGlobalNav({
			mode: 'quiz'
		})

		expect(queryByTestId('btn-start')).toBeNull()
		expect(queryByTestId('btn-copy-link')).toBeNull()
		expect(queryByTestId('numpad-next')).toBeNull()
		expect(getByTestId('btn-menu')).toBeTruthy()
		expect(getByTestId('btn-results')).toBeTruthy()
		expect(getByTestId('btn-global-settings')).toBeTruthy()
	})
})
