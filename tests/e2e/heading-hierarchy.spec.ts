import { expect, test } from '@playwright/test'
import {
	readPuzzle,
	solvePuzzle,
	submitAnswer,
	waitForApp,
	waitForPuzzle
} from './e2eHelpers'

/**
 * Collects visible heading elements and returns their levels in DOM order.
 */
async function getHeadingLevels(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
		return Array.from(headings)
			.filter((el) => {
				const r = el.getBoundingClientRect()
				return r.width > 0 && r.height > 0
			})
			.map((el) => ({
				level: parseInt(el.tagName[1]!, 10),
				text: el.textContent?.trim() ?? ''
			}))
	})
}

/**
 * Asserts heading levels never skip (e.g. h1 → h3 without h2).
 */
function assertNoSkippedLevels(
	headings: { level: number; text: string }[],
	screen: string
) {
	expect(headings.length, `${screen} should have headings`).toBeGreaterThan(0)
	expect(headings[0]!.level, `${screen} should start with h1`).toBe(1)

	for (let i = 1; i < headings.length; i++) {
		const curr = headings[i]!
		const prev = headings[i - 1]!
		const jump = curr.level - prev.level
		expect
			.soft(
				jump,
				`${screen}: heading "${curr.text}" (h${curr.level}) skips a level after "${prev.text}" (h${prev.level})`
			)
			.toBeLessThanOrEqual(1)
	}
}

test.describe('heading hierarchy (WCAG 2.4.10)', () => {
	test('menu screen has valid heading hierarchy', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		const headings = await getHeadingLevels(page)
		assertNoSkippedLevels(headings, 'menu')
	})

	test('quiz screen has valid heading hierarchy', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const headings = await getHeadingLevels(page)
		assertNoSkippedLevels(headings, 'quiz')
	})

	test('results screen has valid heading hierarchy', async ({ page }) => {
		await page.goto('/?duration=0&operator=0&difficulty=1')
		await waitForApp(page)

		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const puzzle = await readPuzzle(page)
		await submitAnswer(page, solvePuzzle(puzzle))
		await waitForPuzzle(page)

		await page.getByTestId('btn-complete-quiz').click()
		await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
			timeout: 10_000
		})
		await page.getByTestId('btn-complete-yes').click()
		await expect(page.getByTestId('heading-results')).toBeVisible({
			timeout: 10_000
		})

		const headings = await getHeadingLevels(page)
		assertNoSkippedLevels(headings, 'results')
	})
})
