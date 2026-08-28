// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import {
	alert_must_select,
	heading_select_operator
} from '#lib/paraglide/messages.js'
import OperatorSelectionPanel from '#lib/components/panels/OperatorSelectionPanel.svelte'

describe('OperatorSelectionPanel validation association', () => {
	afterEach(() => {
		cleanup()
	})

	it('names the radiogroup from its legend', () => {
		const { container } = render(OperatorSelectionPanel, {
			props: { onSelectedOperatorChange: () => {} }
		})

		// role="radiogroup" is required for aria-invalid, and discards the implicit
		// <legend> naming.
		const group = container.querySelector('fieldset')
		expect(group?.getAttribute('role')).toBe('radiogroup')
		const labelledBy = group?.getAttribute('aria-labelledby')
		expect(labelledBy).toBeTruthy()
		expect(document.getElementById(labelledBy ?? '')?.textContent).toBe(
			heading_select_operator()
		)
	})

	it('leaves the group valid and the live region empty without an error', () => {
		const { container, getByTestId } = render(OperatorSelectionPanel, {
			props: { onSelectedOperatorChange: () => {} }
		})

		const group = container.querySelector('fieldset')
		expect(group?.getAttribute('aria-invalid')).toBeNull()
		expect(group?.getAttribute('aria-describedby')).toBeNull()
		// The region must stay mounted so its first update is announced.
		expect(getByTestId('operator-selection-error').textContent.trim()).toBe('')
	})

	it('marks the group invalid and points it at the error message', () => {
		const { container } = render(OperatorSelectionPanel, {
			props: {
				onSelectedOperatorChange: () => {},
				showValidationError: true
			}
		})

		const group = container.querySelector('fieldset')
		expect(group?.getAttribute('aria-invalid')).toBe('true')

		const describedBy = group?.getAttribute('aria-describedby')
		expect(describedBy).toBeTruthy()
		expect(document.getElementById(describedBy ?? '')?.textContent).toContain(
			alert_must_select()
		)
	})
})
