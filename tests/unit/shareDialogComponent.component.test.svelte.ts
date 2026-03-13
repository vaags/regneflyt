// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import ShareDialogComponent from '../../src/components/dialogs/ShareDialogComponent.svelte'

vi.mock('$lib/paraglide/messages.js', () => ({
	heading_sharing: () => 'Share',
	label_title: () => 'Title',
	button_share: () => 'Share',
	button_close: () => 'Close',
	app_title: () => 'Regneflyt'
}))

vi.mock('../../src/helpers/urlParamsHelper', () => ({
	buildShareUrl: (url: string, title: string) => `${url}?title=${title}`
}))

describe('ShareDialogComponent', () => {
	afterEach(() => cleanup())

	it('renders the title input field', () => {
		const { container } = render(ShareDialogComponent)
		const input = container.querySelector('input#share-title')
		expect(input).toBeTruthy()
		expect(input?.getAttribute('type')).toBe('text')
		expect(input?.getAttribute('maxlength')).toBe('50')
	})

	it('renders the share button', () => {
		const { getByTestId } = render(ShareDialogComponent)
		expect(getByTestId('btn-share').textContent).toBe('Share')
	})

	it('renders the title label', () => {
		const { container } = render(ShareDialogComponent)
		const label = container.querySelector('label[for="share-title"]')
		expect(label).toBeTruthy()
		expect(label?.textContent).toBe('Title')
	})

	it('has a dialog element in the DOM', () => {
		const { container } = render(ShareDialogComponent)
		const dialog = container.querySelector('dialog')
		expect(dialog).toBeTruthy()
		expect(dialog?.hasAttribute('open')).toBe(false)
	})
})
