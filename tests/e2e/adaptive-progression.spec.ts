import { expect, test, type Page } from '@playwright/test'

type ParsedPuzzle = {
	raw: string
	left: number | undefined
	right: number | undefined
	result: number | undefined
	operator: '+' | '-' | '*' | '/'
	unknownIndex: 0 | 1 | 2
}

async function configureAdaptiveAddition(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify({
				adaptive: [38, 0, 0, 0],
				custom: [0, 0, 0, 0]
			})
		)
	})

	await page.goto('/?duration=0.5&showSettings=true')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-1"]').click()
}

async function configureCustomAdaptiveAddition(page: Page) {
	await page.goto('/?duration=0.5&showSettings=true')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-0"]').click()
	await page.selectOption('#partOneMin-0', '10')
	await page.selectOption('#partOneMax-0', '20')
	await page.getByRole('radio', { name: 'Normal' }).check()
}

function normalizeExpression(value: string) {
	return value
		.replace(/\s+/g, '')
		.replace(/−/g, '-')
		.replace(/×/g, '*')
		.replace(/÷/g, '/')
}

async function readPuzzle(page: Page): Promise<ParsedPuzzle> {
	const raw = await page.locator('form .mb-4').first().innerText()
	const normalized = normalizeExpression(raw)
	const match = normalized.match(
		/^(\?|[-]?\d+)([+\-*/])(\?|[-]?\d+)=(\?|[-]?\d+)$/
	)

	if (!match)
		throw new Error(
			`Could not parse puzzle expression from: "${raw}" -> "${normalized}"`
		)

	const left = match[1] === '?' ? undefined : Number(match[1])
	const right = match[3] === '?' ? undefined : Number(match[3])
	const result = match[4] === '?' ? undefined : Number(match[4])

	const unknownIndex =
		left === undefined ? 0 : right === undefined ? 1 : (2 as const)

	return {
		raw: normalized,
		left,
		right,
		result,
		operator: match[2] as ParsedPuzzle['operator'],
		unknownIndex
	}
}

function solvePuzzle(puzzle: ParsedPuzzle): number {
	const { left, right, result, operator } = puzzle

	switch (operator) {
		case '+':
			if (left === undefined) return (result as number) - (right as number)
			if (right === undefined) return (result as number) - (left as number)
			return (left as number) + (right as number)
		case '-':
			if (left === undefined) return (result as number) + (right as number)
			if (right === undefined) return (left as number) - (result as number)
			return (left as number) - (right as number)
		case '*':
			if (left === undefined) return (result as number) / (right as number)
			if (right === undefined) return (result as number) / (left as number)
			return (left as number) * (right as number)
		case '/':
			if (left === undefined) return (result as number) * (right as number)
			if (right === undefined) return (left as number) / (result as number)
			return (left as number) / (right as number)
		default:
			throw new Error('Operator not supported')
	}
}

async function submitAnswer(page: Page, value: number) {
	if (value < 0) {
		await page.keyboard.press('-')
	}

	for (const digit of Math.abs(value).toString()) {
		await page.keyboard.press(digit)
	}

	await page.keyboard.press('Enter')
}

async function readPuzzleNumber(page: Page): Promise<number> {
	const heading = await page
		.getByText(/^Oppgave\s+\d+$/)
		.first()
		.innerText()
	const match = heading.match(/\d+/)

	if (!match)
		throw new Error(`Could not parse puzzle number from heading: "${heading}"`)

	return Number(match[0])
}

async function waitForNextPuzzle(page: Page, previousPuzzleNumber: number) {
	await expect
		.poll(
			async () => {
				return readPuzzleNumber(page)
			},
			{ timeout: 5000 }
		)
		.toBeGreaterThan(previousPuzzleNumber)
}

test('adaptive mode gradually progresses from normal to non-normal unknown part', async ({
	page
}) => {
	await configureAdaptiveAddition(page)

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 8000 })

	const firstPuzzle = await readPuzzle(page)
	expect(firstPuzzle.unknownIndex).toBe(2)

	let observedNonNormalUnknownPart = false

	for (let i = 0; i < 8; i++) {
		const puzzle = await readPuzzle(page)
		const puzzleNumber = await readPuzzleNumber(page)
		const answer = solvePuzzle(puzzle)

		await submitAnswer(page, answer)
		await waitForNextPuzzle(page, puzzleNumber)

		const nextPuzzle = await readPuzzle(page)
		if (nextPuzzle.unknownIndex !== 2) {
			observedNonNormalUnknownPart = true
			break
		}
	}

	expect(observedNonNormalUnknownPart).toBe(true)
})

test('custom adaptive mode keeps generated addition operands within selected bounds', async ({
	page
}) => {
	await configureCustomAdaptiveAddition(page)

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 8000 })

	for (let i = 0; i < 8; i++) {
		const puzzle = await readPuzzle(page)
		const puzzleNumber = await readPuzzleNumber(page)

		expect(puzzle.unknownIndex).toBe(2)
		expect(puzzle.left).toBeGreaterThanOrEqual(10)
		expect(puzzle.left).toBeLessThanOrEqual(20)
		expect(puzzle.right).toBeGreaterThanOrEqual(10)
		expect(puzzle.right).toBeLessThanOrEqual(20)

		const answer = solvePuzzle(puzzle)
		await submitAnswer(page, answer)

		if (i < 7) await waitForNextPuzzle(page, puzzleNumber)
	}
})
