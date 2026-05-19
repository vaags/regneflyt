// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import {
	complete_confirm,
	complete_confirm_message
} from '$lib/paraglide/messages.js'
import { overwriteGetLocale } from '$lib/paraglide/runtime.js'
import CompleteQuizDialogComponent from '$lib/components/dialogs/CompleteQuizDialogComponent.svelte'

describe('CompleteQuizDialogComponent', () => {
	beforeEach(() => {
		overwriteGetLocale(() => 'en')
	})

	afterEach(() => {
		cleanup()
	})

	it('updates localized copy when locale prop changes while mounted', async () => {
		const { getByTestId, rerender } = render(CompleteQuizDialogComponent, {
			locale: 'en'
		})

		expect(getByTestId('complete-dialog-heading').textContent).toBe(
			complete_confirm({}, { locale: 'en' })
		)
		expect(getByTestId('complete-confirm-message').textContent).toBe(
			complete_confirm_message({}, { locale: 'en' })
		)

		await rerender({ locale: 'nb' })

		expect(getByTestId('complete-dialog-heading').textContent).toBe(
			complete_confirm({}, { locale: 'nb' })
		)
		expect(getByTestId('complete-confirm-message').textContent).toBe(
			complete_confirm_message({}, { locale: 'nb' })
		)
	})
})
