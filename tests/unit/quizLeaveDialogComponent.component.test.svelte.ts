// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import {
	cancel_confirm,
	quit_confirm_message
} from '$lib/paraglide/messages.js'
import { overwriteGetLocale } from '$lib/paraglide/runtime.js'
import QuizLeaveDialogComponent from '$lib/components/dialogs/QuizLeaveDialogComponent.svelte'

describe('QuizLeaveDialogComponent', () => {
	beforeEach(() => {
		overwriteGetLocale(() => 'en')
	})

	afterEach(() => {
		cleanup()
	})

	it('renders localized heading and message from its message keys', () => {
		const { getByTestId } = render(QuizLeaveDialogComponent, {
			locale: 'nb'
		})

		expect(getByTestId('quit-dialog-heading').textContent).toBe(
			cancel_confirm({}, { locale: 'nb' })
		)
		expect(getByTestId('quit-confirm-message').textContent).toBe(
			quit_confirm_message({}, { locale: 'nb' })
		)
	})
})
