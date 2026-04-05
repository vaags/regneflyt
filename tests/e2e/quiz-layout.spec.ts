import { test, expect } from '@playwright/test'
import {
	ADAPTIVE_PROFILES_KEY,
	openConfiguredMenu,
	waitForPuzzle
} from './e2eHelpers'

test.describe('quiz layout gap', () => {
	test.use({ viewport: { width: 375, height: 667 } })

	test('gap between puzzle panel and global nav equals panel-stack-gap', async ({
		page
	}) => {
		await page.addInitScript((key) => {
			localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
		}, ADAPTIVE_PROFILES_KEY)
		await openConfiguredMenu(page, 'operator=0&difficulty=1&duration=0')
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)

		const { actualGap, expectedGap } = await page.evaluate(() => {
			const temp = document.createElement('div')
			temp.style.height = 'var(--panel-stack-gap)'
			temp.style.position = 'absolute'
			temp.style.visibility = 'hidden'
			document.body.appendChild(temp)
			const expectedGap = temp.getBoundingClientRect().height
			temp.remove()

			const puzzleSurface = document.querySelector(
				'[data-puzzle-state="ready"] .panel-surface'
			)
			if (!puzzleSurface) throw new Error('Puzzle panel-surface not found')

			const navSurface = document.querySelector(
				'[data-testid="global-nav"] .panel-surface'
			)
			if (!navSurface) throw new Error('Nav panel-surface not found')

			return {
				actualGap:
					navSurface.getBoundingClientRect().top -
					puzzleSurface.getBoundingClientRect().bottom,
				expectedGap
			}
		})

		expect(expectedGap).toBeGreaterThan(0)
		expect(actualGap).toBeCloseTo(expectedGap, 0)
	})
})
