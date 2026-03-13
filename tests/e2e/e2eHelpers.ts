import type { Page } from '@playwright/test'

/**
 * Caps all setTimeout/setInterval delays at a low maximum so countdown
 * screens (separator, game-over) complete almost instantly. Must be
 * called **before** page.goto().
 */
export async function installFastTimers(page: Page, maxDelay = 50) {
	await page.addInitScript((cap: number) => {
		const origSetTimeout = window.setTimeout.bind(window)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(window as any).setTimeout = (
			fn: TimerHandler,
			delay?: number,
			...args: unknown[]
		) => origSetTimeout(fn, Math.min(delay ?? 0, cap), ...args)

		const origSetInterval = window.setInterval.bind(window)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		;(window as any).setInterval = (
			fn: TimerHandler,
			delay?: number,
			...args: unknown[]
		) => origSetInterval(fn, Math.min(delay ?? 0, cap), ...args)
	}, maxDelay)
}

export type ParsedPuzzle = {
	raw: string
	left: number | undefined
	right: number | undefined
	result: number | undefined
	operator: '+' | '-' | '*' | '/'
	unknownIndex: 0 | 1 | 2
}

export function normalizeExpression(value: string) {
	return value
		.replace(/\s+/g, '')
		.replace(/−/g, '-')
		.replace(/×/g, '*')
		.replace(/÷/g, '/')
}

export async function waitForPuzzle(page: Page, timeout = 15_000) {
	const { expect } = await import('@playwright/test')
	await expect(page.getByTestId('puzzle-expression')).toHaveText(/[?]/, {
		timeout
	})
}

export async function readPuzzle(page: Page): Promise<ParsedPuzzle> {
	const raw = await page.getByTestId('puzzle-expression').innerText()
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

export function solvePuzzle(puzzle: ParsedPuzzle): number {
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

export async function submitAnswer(page: Page, value: number) {
	await page.keyboard.type(value.toString())
	await page.keyboard.press('Enter')
}

export async function readPuzzleNumber(page: Page): Promise<number> {
	const heading = await page.getByTestId('puzzle-heading').innerText()
	const match = heading.match(/\d+/)

	if (!match)
		throw new Error(`Could not parse puzzle number from heading: "${heading}"`)

	return Number(match[0])
}

export async function waitForNextPuzzle(
	page: Page,
	previousPuzzleNumber: number
) {
	const { expect } = await import('@playwright/test')
	await expect
		.poll(
			async () => {
				return readPuzzleNumber(page)
			},
			{ timeout: 5000 }
		)
		.toBeGreaterThan(previousPuzzleNumber)
}
