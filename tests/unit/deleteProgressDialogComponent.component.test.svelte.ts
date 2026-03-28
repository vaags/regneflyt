// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import {
	delete_progress_confirm,
	delete_progress_message
} from '$lib/paraglide/messages.js'
import { overwriteGetLocale } from '$lib/paraglide/runtime.js'
import DeleteProgressDialogComponent from '$lib/components/dialogs/DeleteProgressDialogComponent.svelte'

describe('DeleteProgressDialogComponent', () => {
	beforeEach(() => {
		overwriteGetLocale(() => 'en')
	})

	afterEach(() => cleanup())

	it('updates localized copy when locale prop changes while mounted', async () => {
		const { getByTestId, rerender } = render(DeleteProgressDialogComponent, {
			locale: 'en'
		})

		expect(getByTestId('delete-progress-dialog-heading').textContent).toBe(
			delete_progress_confirm({}, { locale: 'en' })
		)
		expect(getByTestId('delete-progress-message').textContent).toBe(
			delete_progress_message({}, { locale: 'en' })
		)

		await rerender({ locale: 'nb' })

		expect(getByTestId('delete-progress-dialog-heading').textContent).toBe(
			delete_progress_confirm({}, { locale: 'nb' })
		)
		expect(getByTestId('delete-progress-message').textContent).toBe(
			delete_progress_message({}, { locale: 'nb' })
		)
	})
})
