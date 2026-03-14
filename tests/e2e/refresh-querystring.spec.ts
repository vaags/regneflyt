import { expect, test } from '@playwright/test'
import { readPuzzle, waitForApp, waitForPuzzle } from './e2eHelpers'

function getSearchParam(url: string, key: string): string | null {
	return new URL(url).searchParams.get(key)
}

test('hard refresh with querystring does not throw replaceState init error', async ({
	page
}) => {
	const pageErrors: string[] = []
	page.on('pageerror', (error) => pageErrors.push(error.message))

	const search = new URLSearchParams({
		duration: '0.5',
		operator: '0',
		addMin: '1',
		addMax: '5',
		subMin: '1',
		subMax: '10',
		mulValues: '1,2',
		divValues: '1,2',
		puzzleMode: '0',
		difficulty: '1',
		allowNegativeAnswers: 'false'
	})

	await page.goto(`/?${search.toString()}`)
	await waitForApp(page)

	await page.reload()
	await waitForApp(page)

	expect(
		pageErrors.some((message) =>
			message.includes(
				'Cannot call replaceState(...) before router is initialized'
			)
		)
	).toBe(false)
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
})

test('normalizes malformed query values into safe settings', async ({
	page
}) => {
	await page.goto(
		'/?showSettings=true&operator=0&difficulty=0&duration=999&addMin=90&addMax=10&subMin=-100&subMax=999&mulValues=0,3,13,foo&divValues=100,bar&puzzleMode=2'
	)

	await expect(page.getByTestId('heading-select-operator')).toBeVisible()

	await expect.poll(() => getSearchParam(page.url(), 'duration')).toBe('480')
	await expect.poll(() => getSearchParam(page.url(), 'addMin')).toBe('10')
	await expect.poll(() => getSearchParam(page.url(), 'addMax')).toBe('90')
	await expect.poll(() => getSearchParam(page.url(), 'subMin')).toBe('-50')
	await expect.poll(() => getSearchParam(page.url(), 'subMax')).toBe('100')
	await expect.poll(() => getSearchParam(page.url(), 'mulValues')).toBe('3,13')
	await expect.poll(() => getSearchParam(page.url(), 'divValues')).toBe('5')
})

test('uses persisted adaptive profile after reload', async ({ page }) => {
	await page.goto('/?showSettings=true&operator=0&difficulty=1&duration=0.5')
	await waitForApp(page)

	await page.evaluate(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify([100, 0, 0, 0])
		)
	})

	await page.reload()
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	// At skill 100, the adaptive range lower bound is ~90, so all visible
	// operands should be large. This confirms the persisted skill was loaded.
	// (At skill 0, operands would be in [1, 5].)
	const puzzle = await readPuzzle(page)
	const visibleValues = [puzzle.left, puzzle.right, puzzle.result].filter(
		(v): v is number => v !== undefined
	)
	for (const v of visibleValues) {
		expect(v).toBeGreaterThanOrEqual(20)
	}
})
