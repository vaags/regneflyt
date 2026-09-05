// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
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
			const { getByTestId, container } =
				renderDialogPrimitiveHarness() as unknown as {
					getByTestId: (testId: string) => HTMLElement
					container: HTMLElement
				}

			await fireEvent.click(getByTestId('dialog-open'))

			const closeButton = getByTestId('btn-dialog-close')
			const closeSvg = closeButton.querySelector('svg')
			const srOnlyText =
				closeButton.querySelector('.sr-only')?.textContent ?? ''
			expect(
				hasAccessibleIconButtonName({
					svgAriaLabel: closeSvg?.getAttribute('aria-label'),
					buttonAriaLabel: closeButton.getAttribute('aria-label'),
					buttonText: closeButton.textContent,
					hasSrOnlyText: srOnlyText.trim().length > 0
				})
			).toBe(true)

			const headingText = getByTestId('dialog-heading').textContent
			expect(headingText.trim().length > 0).toBe(true)
			expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true)
		})

		it('names the dialog via aria-labelledby pointing at its heading', async () => {
			const { getByTestId, container } =
				renderDialogPrimitiveHarness() as unknown as {
					getByTestId: (testId: string) => HTMLElement
					container: HTMLElement
				}

			await fireEvent.click(getByTestId('dialog-open'))

			const dialogElement = container.querySelector('dialog')
			expect(dialogElement?.getAttribute('aria-modal')).toBe('true')

			const labelledBy = dialogElement?.getAttribute('aria-labelledby') ?? ''
			expect(labelledBy.length > 0).toBe(true)
			expect(getByTestId('dialog-heading').id).toBe(labelledBy)
		})

		it('moves initial focus to the first interactive control', async () => {
			const originalRaf = window.requestAnimationFrame.bind(window)
			window.requestAnimationFrame = (cb: FrameRequestCallback) => {
				cb(0)
				return 0
			}

			try {
				const { getByTestId } = renderDialogPrimitiveHarness() as unknown as {
					getByTestId: (testId: string) => HTMLElement
				}
				await fireEvent.click(getByTestId('dialog-open'))

				expect(document.activeElement).toBe(getByTestId('btn-dialog-close'))
			} finally {
				window.requestAnimationFrame = originalRaf
			}
		})

		it('focuses the dismiss action when initialFocus is dismiss', async () => {
			const originalRaf = window.requestAnimationFrame.bind(window)
			window.requestAnimationFrame = (cb: FrameRequestCallback) => {
				cb(0)
				return 0
			}

			try {
				const { getByTestId } = renderDialogPrimitiveHarness({
					initialFocus: 'dismiss'
				}) as unknown as {
					getByTestId: (testId: string) => HTMLElement
				}
				await fireEvent.click(getByTestId('dialog-open'))

				expect(document.activeElement).toBe(getByTestId('dialog-dismiss'))
			} finally {
				window.requestAnimationFrame = originalRaf
			}
		})

		it('restores focus to the trigger after Escape closes the dialog', async () => {
			vi.useFakeTimers()
			const originalRaf = window.requestAnimationFrame.bind(window)
			window.requestAnimationFrame = (callback: FrameRequestCallback) => {
				callback(0)
				return 0
			}

			try {
				const { getByTestId, container } =
					renderDialogPrimitiveHarness() as unknown as {
						getByTestId: (testId: string) => HTMLElement
						container: HTMLElement
					}
				const trigger = getByTestId('dialog-open')
				trigger.focus()
				await fireEvent.click(trigger)

				const dialog = container.querySelector('dialog')
				expect(dialog).toBeTruthy()
				await fireEvent.keyDown(dialog!, { key: 'Escape' })
				vi.runAllTimers()
				dialog!.dispatchEvent(new Event('close'))

				expect(document.activeElement).toBe(trigger)
			} finally {
				window.requestAnimationFrame = originalRaf
				vi.useRealTimers()
			}
		})

		it('traps focus by wrapping from last to first and first to last', async () => {
			const { getByTestId, container } =
				renderDialogPrimitiveHarness() as unknown as {
					getByTestId: (testId: string) => HTMLElement
					container: HTMLElement
				}
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
			const { container, getByTestId } =
				renderNumpadPrimitiveHarness() as unknown as {
					getByTestId: (testId: string) => HTMLElement
					container: HTMLElement
				}

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
		it('exposes an accessible form, numeric answer field, and live puzzle updates', () => {
			const { container, getByTestId } =
				renderPuzzlePrimitiveHarness() as unknown as {
					getByTestId: (testId: string) => HTMLElement
					container: HTMLElement
				}

			const form = container.querySelector<HTMLFormElement>('form')
			expect(form).toBeTruthy()
			expect(form?.getAttribute('autocomplete')).toBe('off')
			expect(form?.hasAttribute('novalidate')).toBe(true)
			expect(
				hasAccessibleFormName({
					ariaLabel: form?.getAttribute('aria-label'),
					ariaLabelledBy: form?.getAttribute('aria-labelledby')
				})
			).toBe(true)

			const answer = getByTestId('puzzle-answer-value')
			expect(answer.getAttribute('type')).toBe('number')
			expect(answer.getAttribute('min')).toBe('-999')
			expect(answer.getAttribute('max')).toBe('999')
			expect(answer.getAttribute('step')).toBe('1')
			expect(answer.getAttribute('autocomplete')).toBe('off')
			expect(answer.getAttribute('inputmode')).toBe('none')
			expect(answer.getAttribute('name')).toBeNull()
			expect(answer.getAttribute('pattern')).toBeNull()
			expect(answer.getAttribute('maxlength')).toBeNull()

			const expression = getByTestId('puzzle-expression-announcer')
			// Polite, not assertive: a new puzzle is routine progress, not an error,
			// so it must not interrupt whatever the screen reader is saying.
			expect(expression.getAttribute('aria-live')).toBe('polite')
			expect(expression.getAttribute('aria-atomic')).toBe('true')
		})
	})
})
