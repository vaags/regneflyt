import type { APIRequestContext, APIResponse, Page } from '@playwright/test'

/**
 * localStorage key prefix matching the app's `import.meta.env.DEV` logic.
 * Dev mode stores use a 'dev.' prefix; production builds use none.
 */
export const STORAGE_KEY_PREFIX = process.env.CI != null ? '' : 'dev.'

export const ADAPTIVE_PROFILES_KEY = `${STORAGE_KEY_PREFIX}regneflyt.adaptive-profiles.v1`
export const ONBOARDING_COMPLETED_KEY = `${STORAGE_KEY_PREFIX}regneflyt.onboarding-completed.v1`

export type ParsedPuzzle = {
	raw: string
	left: number | undefined
	right: number | undefined
	result: number | undefined
	operator: '+' | '-' | '*' | '/'
	unknownIndex: 0 | 1 | 2
}

function parsePuzzleOperator(value: string): ParsedPuzzle['operator'] {
	if (value === '+' || value === '-' || value === '*' || value === '/') {
		return value
	}

	throw new Error(`Unsupported operator in puzzle expression: ${value}`)
}

function requireNumber(
	value: number | undefined,
	name: 'left' | 'right' | 'result'
): number {
	if (value === undefined) {
		throw new Error(`Expected ${name} to be defined when solving puzzle`)
	}

	return value
}

export function normalizeExpression(value: string): string {
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
export async function waitForApp(page: Page): Promise<void> {
	const { expect } = await import('@playwright/test')
	await expect(page.getByTestId('heading-select-operator')).toBeVisible()
}

/**
 * Ensures panel content is available by expanding any collapsed panel toggles.
 * Uses a panel-specific data attribute to avoid interacting with non-panel
 * controls that also expose `aria-expanded`.
 */
export async function expandAllCollapsedPanels(page: Page): Promise<void> {
	const collapsedPanelToggles = page.locator(
		'[data-panel-toggle="true"][aria-expanded="false"]'
	)

	while ((await collapsedPanelToggles.count()) > 0) {
		await collapsedPanelToggles.first().click()
	}
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
	if (baseURL == null) {
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
): Promise<void> {
	await page.goto(`/?${query}`)
	await waitForApp(page)
}

/**
 * Waits for settings route interactivity by observing an explicit hydration marker.
 */
export async function waitForSettingsRouteHydration(
	page: Page,
	timeout = 5_000
): Promise<void> {
	const { expect } = await import('@playwright/test')
	const settingsPanel = page.getByTestId('settings-panel')
	await expect(settingsPanel).toBeVisible({ timeout })
	await expect(settingsPanel).toHaveAttribute(
		'data-settings-hydrated',
		'true',
		{ timeout }
	)
	await expandAllCollapsedPanels(page)
}

export async function toggleDevTools(page: Page): Promise<void> {
	await page.keyboard.press('ControlOrMeta+Shift+D')
}

type StartQuizOptions = {
	url?: string
	operatorTestId?: string
	waitForPuzzle?: boolean
}

/**
 * Selects the first operator, easiest difficulty, and clicks start.
 */
export async function startQuiz(
	page: Page,
	options: StartQuizOptions = {}
): Promise<void> {
	const {
		url,
		operatorTestId = 'operator-0',
		waitForPuzzle: shouldWaitForPuzzle = false
	} = options

	if (url !== undefined) {
		await page.goto(url)
		await waitForApp(page)
	}

	await page.getByTestId(operatorTestId).check()
	await page.getByTestId('difficulty-1').check()
	await page.getByTestId('btn-start').click()

	if (shouldWaitForPuzzle) {
		await waitForPuzzle(page)
	}
}

/**
 * Waits until the puzzle component signals it is interactive.
 * Uses the stable `data-puzzle-state` attribute instead of parsing
 * animated text, eliminating race conditions with tween animations
 * and countdown transitions.
 */
export async function waitForPuzzle(
	page: Page,
	timeout = 25_000
): Promise<void> {
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

	if (raw == null)
		throw new Error('Puzzle form is ready but data-puzzle-expression is empty')

	const normalized = normalizeExpression(raw)
	const match = /^(\?|[-]?\d+)([+\-*/])(\?|[-]?\d+)=(\?|[-]?\d+)$/.exec(
		normalized
	)

	if (match == null)
		throw new Error(
			`Could not parse puzzle expression: "${raw}" -> "${normalized}"`
		)

	const left = match[1] === '?' ? undefined : Number(match[1])
	const right = match[3] === '?' ? undefined : Number(match[3])
	const result = match[4] === '?' ? undefined : Number(match[4])
	const operatorToken = match[2]
	if (operatorToken === undefined) {
		throw new Error(`Missing operator in puzzle expression: ${normalized}`)
	}

	const unknownIndex = left === undefined ? 0 : right === undefined ? 1 : 2

	return {
		raw: normalized,
		left,
		right,
		result,
		operator: parsePuzzleOperator(operatorToken),
		unknownIndex
	}
}

export function solvePuzzle(puzzle: ParsedPuzzle): number {
	const { left, right, result, operator } = puzzle

	switch (operator) {
		case '+':
			if (left === undefined)
				return requireNumber(result, 'result') - requireNumber(right, 'right')
			if (right === undefined) return requireNumber(result, 'result') - left
			return left + right
		case '-':
			if (left === undefined)
				return requireNumber(result, 'result') + requireNumber(right, 'right')
			if (right === undefined) return left - requireNumber(result, 'result')
			return left - right
		case '*':
			if (left === undefined)
				return requireNumber(result, 'result') / requireNumber(right, 'right')
			if (right === undefined) return requireNumber(result, 'result') / left
			return left * right
		case '/':
			if (left === undefined)
				return requireNumber(result, 'result') * requireNumber(right, 'right')
			if (right === undefined) return left / requireNumber(result, 'result')
			return left / right
		default:
			throw new Error('Operator not supported')
	}
}

export async function submitAnswer(page: Page, value: number): Promise<void> {
	await page.keyboard.type(value.toString())
	await page.keyboard.press('Enter')
}

/**
 * Reads the current puzzle number from `data-puzzle-number`.
 */
export async function readPuzzleNumber(page: Page): Promise<number> {
	const form = page.locator('[data-puzzle-state="ready"]')
	const num = await form.getAttribute('data-puzzle-number')
	if (num == null)
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
): Promise<void> {
	const { expect } = await import('@playwright/test')
	await expect
		.poll(
			async () => {
				const attr = await page
					.locator('[data-puzzle-number]')
					.getAttribute('data-puzzle-number')
				return attr != null ? Number(attr) : 0
			},
			{ timeout: 5000 }
		)
		.toBeGreaterThan(previousPuzzleNumber)
}
