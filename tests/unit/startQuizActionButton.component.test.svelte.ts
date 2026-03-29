// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { button_replay, button_start } from '$lib/paraglide/messages.js'
import StartQuizActionButton from '$lib/components/panels/StartQuizActionButton.svelte'

describe('StartQuizActionButton', () => {
	afterEach(() => cleanup())

	it('renders only primary start button when replay action is absent', () => {
		const onStart = vi.fn()
		const { getByTestId, queryByTestId } = render(StartQuizActionButton, {
			props: { onStart }
		})

		expect(getByTestId('btn-start').textContent).toBe(button_start())
		expect(queryByTestId('btn-start-toggle')).toBeNull()
	})

	it('calls onStart when primary button is clicked', async () => {
		const onStart = vi.fn()
		const { getByTestId } = render(StartQuizActionButton, {
			props: { onStart }
		})

		await fireEvent.click(getByTestId('btn-start'))
		expect(onStart).toHaveBeenCalledOnce()
	})

	it('renders split mode and calls onReplay from secondary action', async () => {
		const onStart = vi.fn()
		const onReplay = vi.fn()
		const { getByTestId, findByTestId } = render(StartQuizActionButton, {
			props: { onStart, onReplay }
		})

		await fireEvent.click(getByTestId('btn-start-toggle'))
		const secondaryAction = await findByTestId('btn-start-secondary')

		expect(secondaryAction.textContent).toBe(button_replay())

		await fireEvent.click(secondaryAction)
		expect(onReplay).toHaveBeenCalledOnce()
		expect(onStart).not.toHaveBeenCalled()
	})

	it('uses locale specific labels when locale prop is provided', async () => {
		const onStart = vi.fn()
		const onReplay = vi.fn()
		const locale = 'nb'
		const { getByTestId, findByTestId } = render(StartQuizActionButton, {
			props: { onStart, onReplay, locale }
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
})
