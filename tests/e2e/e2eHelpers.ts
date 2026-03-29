import type { APIRequestContext, APIResponse, Page } from '@playwright/test'

/**
 * localStorage key prefix matching the app's `import.meta.env.DEV` logic.
 * Dev mode stores use a 'dev.' prefix; production builds use none.
 */
export const STORAGE_KEY_PREFIX = process.env.CI ? '' : 'dev.'

export const ADAPTIVE_PROFILES_KEY = `${STORAGE_KEY_PREFIX}regneflyt.adaptive-profiles.v1`

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

/**
 * Waits for the SvelteKit app to fully hydrate.
 * The heading becoming visible confirms the page component has rendered.
 */
export async function waitForApp(page: Page) {
	const { expect } = await import('@playwright/test')
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
}

type RequestDocumentHtmlOptions = {
	path?: string
	headers?: Record<string, string>
	extraHTTPHeaders?: Record<string, string>
}

export type RequestDocumentHtmlResult = {
	ok: boolean
	html: string
	setCookieHeaders: string[]
}

type RequestContextFactory = {
	request: {
		newContext: (options: {
			baseURL: string
			extraHTTPHeaders?: Record<string, string>
		}) => Promise<APIRequestContext>
	}
}

function getBaseUrlOrThrow(baseURL: string | undefined): string {
	if (!baseURL) {
		throw new Error('Expected Playwright baseURL to be configured')
	}

	return baseURL
}

function getSetCookieHeadersFromResponse(response: APIResponse): string[] {
	return response
		.headersArray()
		.filter((header) => header.name.toLowerCase() === 'set-cookie')
		.map((header) => header.value)
}

export async function requestDocumentHtml(
	playwright: RequestContextFactory,
	baseURL: string | undefined,
	options: RequestDocumentHtmlOptions = {}
): Promise<RequestDocumentHtmlResult> {
	const api = await playwright.request.newContext({
		baseURL: getBaseUrlOrThrow(baseURL),
		...(options.extraHTTPHeaders
			? { extraHTTPHeaders: options.extraHTTPHeaders }
			: {})
	})

	try {
		const response = await api.get(options.path ?? '/', {
			...(options.headers ? { headers: options.headers } : {})
		})

		return {
			ok: response.ok(),
			html: await response.text(),
			setCookieHeaders: getSetCookieHeadersFromResponse(response)
		}
	} finally {
		await api.dispose()
	}
}

export async function openConfiguredMenu(
	page: Page,
	query = 'operator=0&difficulty=1'
) {
	await page.goto(`/?${query}`)
	await waitForApp(page)
}

/**
 * Waits for settings route interactivity by observing an explicit hydration marker.
 */
export async function waitForSettingsRouteHydration(
	page: Page,
	timeout = 5_000
) {
	const { expect } = await import('@playwright/test')
	const settingsPanel = page.getByTestId('settings-panel')
	await expect(settingsPanel).toBeVisible({ timeout })
	await expect(settingsPanel).toHaveAttribute(
		'data-settings-hydrated',
		'true',
		{ timeout }
	)
}

export async function toggleDevTools(page: Page) {
	await page.keyboard.press('ControlOrMeta+Shift+D')
}

/**
 * Selects the first operator, easiest difficulty, and clicks start.
 */
export async function startQuiz(page: Page) {
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()
	await page.getByTestId('btn-start').click()
}

/**
 * Waits until the puzzle component signals it is interactive.
 * Uses the stable `data-puzzle-state` attribute instead of parsing
 * animated text, eliminating race conditions with tween animations
 * and countdown transitions.
 */
export async function waitForPuzzle(page: Page, timeout = 25_000) {
	const { expect } = await import('@playwright/test')
	await expect(page.locator('[data-puzzle-state="ready"]')).toBeAttached({
		timeout
	})
}

/**
 * Reads the current puzzle from the stable `data-puzzle-expression` attribute
 * which reflects raw generated values, unaffected by tween animations.
 */
export async function readPuzzle(page: Page): Promise<ParsedPuzzle> {
	const form = page.locator('[data-puzzle-state="ready"]')
	const raw = await form.getAttribute('data-puzzle-expression')

	if (!raw)
		throw new Error('Puzzle form is ready but data-puzzle-expression is empty')

	const normalized = normalizeExpression(raw)
	const match = normalized.match(
		/^(\?|[-]?\d+)([+\-*/])(\?|[-]?\d+)=(\?|[-]?\d+)$/
	)

	if (!match)
		throw new Error(
			`Could not parse puzzle expression: "${raw}" -> "${normalized}"`
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

/**
 * Reads the current puzzle number from `data-puzzle-number`.
 */
export async function readPuzzleNumber(page: Page): Promise<number> {
	const form = page.locator('[data-puzzle-state="ready"]')
	const num = await form.getAttribute('data-puzzle-number')
	if (!num)
		throw new Error('Could not read puzzle number from data-puzzle-number')
	return Number(num)
}

/**
 * Waits until `data-puzzle-number` advances past the given value.
 * This is immune to tween animations and heading text transitions.
 */
export async function waitForNextPuzzle(
	page: Page,
	previousPuzzleNumber: number
) {
	const { expect } = await import('@playwright/test')
	await expect
		.poll(
			async () => {
				const attr = await page
					.locator('[data-puzzle-number]')
					.getAttribute('data-puzzle-number')
				return attr ? Number(attr) : 0
			},
			{ timeout: 5000 }
		)
		.toBeGreaterThan(previousPuzzleNumber)
}
