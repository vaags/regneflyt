// @vitest-environment happy-dom
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

	afterEach(() => {
		cleanup()
	})

	it('renders localized heading and message from its message keys', () => {
		const { getByTestId } = render(DeleteProgressDialogComponent, {
			locale: 'nb'
		})

		expect(getByTestId('delete-progress-dialog-heading').textContent).toBe(
			delete_progress_confirm({}, { locale: 'nb' })
		)
		expect(getByTestId('delete-progress-message').textContent).toBe(
			delete_progress_message({}, { locale: 'nb' })
		)
	})
})
