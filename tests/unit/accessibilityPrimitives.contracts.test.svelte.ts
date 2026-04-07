// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/svelte'
import {
	hasAccessibleFormName,
	hasAccessibleIconButtonName,
	hasAccessibleLegendText,
	hasExpectedDialogFocusWrap,
	toFocusHook
} from '../helpers/a11yInvariants'
import {
	renderDialogPrimitiveHarness,
	renderNumpadPrimitiveHarness,
	renderPuzzlePrimitiveHarness
} from './harnesses/a11yHarnesses'

if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute('open', '')
	}
}

if (typeof HTMLDialogElement.prototype.close !== 'function') {
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute('open')
	}
}

describe('Primitive accessibility contracts', () => {
	afterEach(() => {
		cleanup()
	})

	describe('Dialog primitive', () => {
		it('exposes named controls when opened', async () => {
			const { getByTestId, container } = renderDialogPrimitiveHarness()

			await fireEvent.click(getByTestId('dialog-open'))

			const closeButton = getByTestId('btn-dialog-close')
			const closeSvg = closeButton.querySelector('svg')
			expect(
				hasAccessibleIconButtonName({
					svgAriaLabel: closeSvg?.getAttribute('aria-label'),
					buttonAriaLabel: closeButton.getAttribute('aria-label'),
					buttonText: closeButton.textContent,
					hasSrOnlyText:
						(closeButton.querySelector('.sr-only')?.textContent.trim().length ??
							0) > 0
				})
			).toBe(true)

			expect(getByTestId('dialog-heading').textContent.trim().length > 0).toBe(
				true
			)
			expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true)
		})

		it('moves initial focus to the first interactive control', async () => {
			const originalRaf = window.requestAnimationFrame
			window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
				cb(0)
				return 0
			}) as typeof window.requestAnimationFrame

			try {
				const { getByTestId } = renderDialogPrimitiveHarness()
				await fireEvent.click(getByTestId('dialog-open'))

				expect(document.activeElement).toBe(getByTestId('btn-dialog-close'))
			} finally {
				window.requestAnimationFrame = originalRaf
			}
		})

		it('prefers explicit initial focus target over default first control', async () => {
			const originalRaf = window.requestAnimationFrame
			window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
				cb(0)
				return 0
			}) as typeof window.requestAnimationFrame

			try {
				const { getByTestId } = renderDialogPrimitiveHarness()
				getByTestId('btn-dialog-close').removeAttribute(
					'data-dialog-initial-focus'
				)
				const input = getByTestId('dialog-input')
				input.setAttribute('data-dialog-initial-focus', 'true')
				await fireEvent.click(getByTestId('dialog-open'))

				expect(document.activeElement).toBe(input)
			} finally {
				window.requestAnimationFrame = originalRaf
			}
		})

		it('traps focus by wrapping from last to first and first to last', async () => {
			const { getByTestId, container } = renderDialogPrimitiveHarness()
			await fireEvent.click(getByTestId('dialog-open'))

			const dialog = container.querySelector('dialog')
			expect(dialog).toBeTruthy()

			const focusable = Array.from(
				dialog!.querySelectorAll<HTMLElement>(
					'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			)
			expect(focusable.length).toBeGreaterThanOrEqual(2)

			const first = focusable[0]!
			const last = focusable[focusable.length - 1]!
			const lastIndex = focusable.length - 1

			const toHook = (el: HTMLElement, focusIndex?: number) =>
				toFocusHook({
					testId: el.getAttribute('data-testid'),
					id: el.id,
					ariaLabel: el.getAttribute('aria-label'),
					...(typeof focusIndex === 'number' ? { focusIndex } : {})
				})

			last.focus()
			await fireEvent.keyDown(dialog!, { key: 'Tab' })
			const activeAfterForward = document.activeElement as HTMLElement
			const forwardIndex = focusable.findIndex(
				(el) => el === activeAfterForward
			)
			expect(
				hasExpectedDialogFocusWrap({
					actualHook: toHook(
						activeAfterForward,
						forwardIndex >= 0 ? forwardIndex : undefined
					),
					expectedHook: toHook(first, 0)
				})
			).toBe(true)

			first.focus()
			await fireEvent.keyDown(dialog!, { key: 'Tab', shiftKey: true })
			const activeAfterBackward = document.activeElement as HTMLElement
			const backwardIndex = focusable.findIndex(
				(el) => el === activeAfterBackward
			)
			expect(
				hasExpectedDialogFocusWrap({
					actualHook: toHook(
						activeAfterBackward,
						backwardIndex >= 0 ? backwardIndex : undefined
					),
					expectedHook: toHook(last, lastIndex)
				})
			).toBe(true)
		})
	})

	describe('Numpad primitive', () => {
		it('provides a non-empty legend and named action buttons', () => {
			const { container, getByTestId } = renderNumpadPrimitiveHarness()

			const legendText = container.querySelector('fieldset legend')?.textContent
			expect(hasAccessibleLegendText(legendText)).toBe(true)

			const deleteButton = getByTestId('numpad-delete')
			expect(
				hasAccessibleIconButtonName({
					buttonText: deleteButton.textContent,
					buttonAriaLabel: deleteButton.getAttribute('aria-label')
				})
			).toBe(true)

			const nextButton = getByTestId('numpad-next')
			expect(
				hasAccessibleIconButtonName({
					buttonText: nextButton.textContent,
					buttonAriaLabel: nextButton.getAttribute('aria-label')
				})
			).toBe(true)
		})
	})

	describe('Puzzle widget', () => {
		it('exposes an accessible form name and live expression updates', () => {
			const { container, getByTestId } = renderPuzzlePrimitiveHarness()

			const form = container.querySelector('form')
			expect(form).toBeTruthy()
			expect(
				hasAccessibleFormName({
					ariaLabel: form?.getAttribute('aria-label'),
					ariaLabelledBy: form?.getAttribute('aria-labelledby')
				})
			).toBe(true)

			const expression = getByTestId('puzzle-expression')
			expect(expression.getAttribute('aria-live')).toBe('assertive')
			expect(expression.getAttribute('aria-atomic')).toBe('true')
		})
	})
})
