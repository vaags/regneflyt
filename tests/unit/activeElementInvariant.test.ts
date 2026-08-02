import { describe, expect, it } from 'vitest'
import { hasVisibleActiveElement } from '../helpers/a11yInvariants'

/**
 * Guards the failure mode this predicate exists to catch: `document.activeElement`
 * falls back to `<body>` when focus leaves the page, and `<body>` reports a box,
 * so a visibility-only check would call that a successful focus move.
 */
describe('hasVisibleActiveElement', () => {
	it('accepts a visible focusable control', () => {
		expect(
			hasVisibleActiveElement({
				tag: 'BUTTON',
				visible: true,
				focusable: true
			})
		).toBe(true)
	})

	it.each(['BODY', 'HTML', 'body'])(
		'rejects <%s> even when it reports a box',
		(tag) => {
			expect(
				hasVisibleActiveElement({ tag, visible: true, focusable: true })
			).toBe(false)
		}
	)

	it('rejects an element that is not focusable', () => {
		expect(
			hasVisibleActiveElement({ tag: 'DIV', visible: true, focusable: false })
		).toBe(false)
	})

	it('rejects a focusable control with no box', () => {
		expect(
			hasVisibleActiveElement({
				tag: 'BUTTON',
				visible: false,
				focusable: true
			})
		).toBe(false)
	})

	it.each([undefined, null, '', '   '])(
		'rejects an unresolved tag (%p) rather than assuming success',
		(tag) => {
			expect(
				hasVisibleActiveElement({ tag, visible: true, focusable: true })
			).toBe(false)
		}
	)

	it.each([undefined, null])(
		'rejects an unresolved visibility or focusability (%p)',
		(value) => {
			expect(
				hasVisibleActiveElement({
					tag: 'BUTTON',
					visible: value,
					focusable: true
				})
			).toBe(false)
			expect(
				hasVisibleActiveElement({
					tag: 'BUTTON',
					visible: true,
					focusable: value
				})
			).toBe(false)
		}
	)
})
