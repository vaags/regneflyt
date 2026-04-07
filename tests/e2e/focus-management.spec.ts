import { expect, test } from '@playwright/test'
import type { Page, ElementHandle, Locator } from '@playwright/test'
import { ADAPTIVE_PROFILES_KEY, waitForApp } from './e2eHelpers'
import {
	hasExpectedDialogFocusWrap,
	isFocusContainedInDialog,
	toFocusHook
} from '../helpers/a11yInvariants'

async function readActiveFocusHook(page: Page) {
	return page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null
		if (!el) return null
		const dialog = el.closest('dialog')
		const focusables = dialog
			? Array.from(
					dialog.querySelectorAll<HTMLElement>(
						'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
					)
				)
			: []
		const focusIndex = focusables.findIndex((node) => node === el)
		return {
			hook: [
				el.getAttribute('data-testid') != null
					? `testid:${el.getAttribute('data-testid')}`
					: null,
				el.id !== '' ? `id:${el.id}` : null,
				el.getAttribute('aria-label') != null
					? `aria:${el.getAttribute('aria-label')}`
					: null,
				focusIndex >= 0 ? `index:${focusIndex}` : null
			].find(Boolean)
		}
	})
}

async function readDialogBoundaryHooks(dialog: Locator, page: Page) {
	const handles = await dialog
		.locator(
			'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)
		.elementHandles()

	const first = handles[0] ?? null
	const last = handles[handles.length - 1] ?? null

	const toHook = async (handle: ElementHandle<Node> | null) => {
		if (!handle) return null
		return handle.evaluate((el) => {
			const node = el as HTMLElement
			const dataTestId = node.getAttribute('data-testid')
			const ariaLabel = node.getAttribute('aria-label')
			return {
				testId: dataTestId,
				id: node.id,
				ariaLabel,
				tagName: node.tagName
			}
		})
	}

	const firstMeta = await toHook(first)
	const lastMeta = await toHook(last)
	const firstIndex = first ? 0 : null
	const lastIndex = last ? handles.length - 1 : null

	if (last) {
		await last.focus()
		await page.keyboard.press('Tab')
	}
	const activeAfterForward = await readActiveFocusHook(page)

	if (first) {
		await first.focus()
		await page.keyboard.press('Shift+Tab')
	}
	const activeAfterBackward = await readActiveFocusHook(page)

	return {
		firstHook: firstMeta
			? toFocusHook({
					...firstMeta,
					...(firstIndex !== null ? { focusIndex: firstIndex } : {})
				})
			: null,
		lastHook: lastMeta
			? toFocusHook({
					...lastMeta,
					...(lastIndex !== null ? { focusIndex: lastIndex } : {})
				})
			: null,
		forwardHook: activeAfterForward?.hook ?? null,
		backwardHook: activeAfterBackward?.hook ?? null
	}
}

test.describe('focus management in dialogs', () => {
	test('skill dialog traps focus and restores it on close', async ({
		page
	}) => {
		await page.addInitScript((key) => {
			localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
		}, ADAPTIVE_PROFILES_KEY)
		await page.goto('/')
		await waitForApp(page)

		// The skill button shows the overall % — click it
		const skillTrigger = page.getByRole('button', { name: /\d+%/ })
		await skillTrigger.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		const boundaries = await readDialogBoundaryHooks(dialog, page)
		expect(boundaries.firstHook).not.toBeNull()
		expect(boundaries.lastHook).not.toBeNull()
		expect(
			hasExpectedDialogFocusWrap({
				actualHook: boundaries.forwardHook,
				expectedHook: boundaries.firstHook
			}),
			'focus should wrap to first element on Tab from last in skill dialog'
		).toBe(true)
		expect(
			hasExpectedDialogFocusWrap({
				actualHook: boundaries.backwardHook,
				expectedHook: boundaries.lastHook
			}),
			'focus should wrap to last element on Shift+Tab from first in skill dialog'
		).toBe(true)

		const activeInDialog = await page.evaluate(() => {
			const el = document.activeElement as HTMLElement | null
			return el?.closest('dialog') !== null
		})
		expect(
			isFocusContainedInDialog({ isInsideDialog: activeInDialog }),
			'focus should stay within skill dialog'
		).toBe(true)

		// Close with Escape
		await page.keyboard.press('Escape')
		await expect(dialog).toBeHidden()
		await expect(skillTrigger).toBeFocused()
	})

	test('close button returns focus to trigger', async ({ page }) => {
		await page.addInitScript((key) => {
			localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
		}, ADAPTIVE_PROFILES_KEY)
		await page.goto('/')
		await waitForApp(page)

		const skillTrigger = page.getByRole('button', { name: /\d+%/ })
		await skillTrigger.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()

		// Close via the X button
		await dialog.getByTestId('btn-dialog-close').click()
		await expect(dialog).toBeHidden()
		await expect(skillTrigger).toBeFocused()
	})
})
