import { expect, test } from '@playwright/test'

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
