import { expect, test } from '@playwright/test'
import { readPuzzle } from './e2eHelpers'

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
		timeLimit: '0',
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
	await page.waitForLoadState('networkidle')

	await page.reload()
	await page.waitForLoadState('networkidle')

	expect(
		pageErrors.some((message) =>
			message.includes(
				'Cannot call replaceState(...) before router is initialized'
			)
		)
	).toBe(false)
	await expect(page.getByText('Velg regneart')).toBeVisible()
})

test('normalizes malformed query values into safe settings', async ({
	page
}) => {
	await page.goto(
		'/?showSettings=true&operator=0&difficulty=0&duration=999&addMin=90&addMax=10&subMin=-100&subMax=999&mulValues=0,3,13,foo&divValues=100,bar&puzzleMode=2'
	)

	await expect(page.getByText('Velg regneart')).toBeVisible()

	await expect.poll(() => getSearchParam(page.url(), 'duration')).toBe('480')
	await expect.poll(() => getSearchParam(page.url(), 'addMin')).toBe('10')
	await expect.poll(() => getSearchParam(page.url(), 'addMax')).toBe('90')
	await expect.poll(() => getSearchParam(page.url(), 'subMin')).toBe('-40')
	await expect.poll(() => getSearchParam(page.url(), 'subMax')).toBe('50')
	await expect.poll(() => getSearchParam(page.url(), 'mulValues')).toBe('3,13')
	await expect.poll(() => getSearchParam(page.url(), 'divValues')).toBe('5')
})

test('uses persisted adaptive profile after reload', async ({ page }) => {
	await page.goto('/?showSettings=true&operator=0&difficulty=1&duration=0.5')

	await page.evaluate(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify({
				adaptive: [100, 0, 0, 0],
				custom: [0, 0, 0, 0]
			})
		)
	})

	await page.reload()
	await expect(page.getByText('Velg regneart')).toBeVisible()

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 8000 })

	const puzzle = await readPuzzle(page)
	expect(puzzle.unknownIndex).not.toBe(2)
})
