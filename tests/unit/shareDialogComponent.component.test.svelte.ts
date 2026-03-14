// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/svelte'
import ShareDialogComponent from '../../src/components/dialogs/ShareDialogComponent.svelte'

const mockBuildShareUrl = vi.fn(
	(url: string, title: string, seed?: number) =>
		`${url}?title=${encodeURIComponent(title)}${seed ? `&seed=${seed}` : ''}`
)

vi.mock('$lib/paraglide/messages.js', () => ({
	heading_sharing: () => 'Share',
	label_title: () => 'Title',
	label_share_same_puzzles: () => 'Same puzzles for everyone',
	button_share: () => 'Share',
	button_close: () => 'Close',
	app_title: () => 'Regneflyt'
}))

vi.mock('../../src/helpers/urlParamsHelper', () => ({
	buildShareUrl: (...args: unknown[]) =>
		mockBuildShareUrl(...(args as [string, string, number?]))
}))

describe('ShareDialogComponent', () => {
	const originalShareDescriptor = Object.getOwnPropertyDescriptor(
		navigator,
		'share'
	)

	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
		if (originalShareDescriptor) {
			Object.defineProperty(navigator, 'share', originalShareDescriptor)
		} else {
			delete (navigator as unknown as Record<string, unknown>).share
		}
	})

	it('renders the title input and share button', () => {
		const { container, getByTestId } = render(ShareDialogComponent, {
			props: { seed: 42, isCustomDifficulty: false }
		})
		const input = container.querySelector('input#share-title')
		expect(input).toBeTruthy()
		expect(input?.getAttribute('maxlength')).toBe('50')
		expect(getByTestId('btn-share').textContent).toBe('Share')
	})

	it('updates title value on input', async () => {
		const { container } = render(ShareDialogComponent, {
			props: { seed: 42, isCustomDifficulty: false }
		})
		const input = container.querySelector(
			'input#share-title'
		) as HTMLInputElement

		await fireEvent.input(input, { target: { value: 'My Quiz' } })
		expect(input.value).toBe('My Quiz')
	})

	it('shows seed checkbox only when isCustomDifficulty is true', () => {
		const { container: withoutCustom } = render(ShareDialogComponent, {
			props: { seed: 42, isCustomDifficulty: false }
		})
		expect(withoutCustom.querySelector('input[type="checkbox"]')).toBeNull()

		cleanup()

		const { container: withCustom } = render(ShareDialogComponent, {
			props: { seed: 42, isCustomDifficulty: true }
		})
		const checkbox = withCustom.querySelector('input[type="checkbox"]')
		expect(checkbox).toBeTruthy()
		expect(withCustom.textContent).toContain('Same puzzles for everyone')
	})

	it('calls buildShareUrl with seed when checkbox is checked', async () => {
		const mockShare = vi.fn().mockResolvedValue(undefined)
		Object.defineProperty(navigator, 'share', {
			value: mockShare,
			writable: true,
			configurable: true
		})

		const { container, getByTestId } = render(ShareDialogComponent, {
			props: { seed: 42, isCustomDifficulty: true }
		})

		const input = container.querySelector(
			'input#share-title'
		) as HTMLInputElement
		await fireEvent.input(input, { target: { value: 'Test' } })

		const checkbox = container.querySelector(
			'input[type="checkbox"]'
		) as HTMLInputElement
		await fireEvent.click(checkbox)

		await fireEvent.click(getByTestId('btn-share'))

		expect(mockBuildShareUrl).toHaveBeenCalledOnce()
		const [, title, seed] = mockBuildShareUrl.mock.calls[0]!
		expect(title).toBe('Test')
		expect(seed).toBe(42)
	})
})
