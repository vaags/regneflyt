import { test, expect } from '@playwright/test'
import {
	openConfiguredMenu,
	setAdaptiveSkills,
	waitForMeasuredGlobalNavHeight,
	waitForPuzzle
} from './e2eHelpers'

test.describe('quiz layout gap', () => {
	test.use({ viewport: { width: 375, height: 667 } })

	test('gap between puzzle panel and global nav equals panel-stack-gap', async ({
		page
	}) => {
		await setAdaptiveSkills(page, [50, 50, 50, 50])
		await openConfiguredMenu(page, 'operator=0&difficulty=1&duration=0')
		await page.getByTestId('btn-start').click()
		await waitForPuzzle(page)
		await waitForMeasuredGlobalNavHeight(page)

		const { expectedGap, panelStackGap, navHeight, mainPaddingBottom } =
			await page.evaluate(() => {
				const temp = document.createElement('div')
				temp.style.height = 'var(--panel-stack-gap)'
				temp.style.position = 'absolute'
				temp.style.visibility = 'hidden'
				document.body.appendChild(temp)
				const computedExpectedGap = temp.getBoundingClientRect().height
				temp.remove()

				const puzzleSurface = document.querySelector(
					'[data-puzzle-state="ready"] .panel-surface'
				)
				if (!puzzleSurface) throw new Error('Puzzle panel-surface not found')
				const puzzlePanelStack = puzzleSurface.closest('.panel-stack-gap')
				if (!(puzzlePanelStack instanceof HTMLElement)) {
					throw new Error('Puzzle panel-stack-gap wrapper not found')
				}

				const nav = document.querySelector('[data-testid="global-nav"]')
				if (!(nav instanceof HTMLElement))
					throw new Error('Global nav not found')

				const main = document.querySelector('#main-content')
				if (!(main instanceof HTMLElement))
					throw new Error('Main content not found')

				const panelStackComputed = getComputedStyle(puzzlePanelStack)
				const mainComputed = getComputedStyle(main)

				return {
					expectedGap: computedExpectedGap,
					panelStackGap: parseFloat(panelStackComputed.paddingBottom),
					navHeight: nav.getBoundingClientRect().height,
					mainPaddingBottom: parseFloat(mainComputed.paddingBottom)
				}
			})

		expect(expectedGap).toBeGreaterThan(0)
		expect(panelStackGap).toBeCloseTo(expectedGap, 0)
		expect(mainPaddingBottom).toBeCloseTo(navHeight, 0)
	})
})
