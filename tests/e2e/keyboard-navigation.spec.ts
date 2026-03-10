import { test, expect, type Page } from '@playwright/test'
import {
	installFastTimers,
	readPuzzle,
	solvePuzzle,
	submitAnswer
} from './e2eHelpers'

async function startQuiz(
	page: Page,
	options?: { url?: string; operator?: string; maxDelay?: number }
) {
	const { url = '/', operator = 'Addisjon', maxDelay } = options ?? {}
	await installFastTimers(page, maxDelay)
	await page.goto(url)
	await page.getByRole('radio', { name: operator }).check()
	await page.getByRole('radio', { name: 'Automatisk' }).check()
	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 5_000 })
}

async function reachResults(page: Page) {
	await startQuiz(page, { url: '/?duration=0.5', maxDelay: 2000 })
	const puzzle = await readPuzzle(page)
	await submitAnswer(page, solvePuzzle(puzzle))
	await expect(page.getByText('Resultater')).toBeVisible({ timeout: 10_000 })
}

test.describe('keyboard navigation', () => {
	test('skip-to-content link becomes visible on first Tab', async ({
		page
	}) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		await page.keyboard.press('Tab')
		const skipLink = page.locator('a[href="#main-content"]')
		await expect(skipLink).toBeFocused()
		// The skip link uses sr-only + focus:not-sr-only — it should be visible when focused
		await expect(skipLink).toBeVisible()
	})

	test('tab through menu selects all interactive controls', async ({
		page
	}) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const focusedElements: string[] = []
		// Tab through menu elements — collect tag names of focused elements
		for (let i = 0; i < 20; i++) {
			await page.keyboard.press('Tab')
			const tag = await page.evaluate(() => {
				const el = document.activeElement
				if (!el || el === document.body) return 'BODY'
				return el.tagName
			})
			focusedElements.push(tag)
		}

		// Should have focused buttons, inputs, and radio/select elements
		expect(focusedElements).toContain('BUTTON')
		expect(focusedElements.some((t) => t === 'INPUT' || t === 'SELECT')).toBe(
			true
		)
	})

	test('operator radio buttons navigable with arrow keys', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Check the first radio, then use arrow keys to navigate
		const additionRadio = page.getByRole('radio', { name: 'Addisjon' })
		await additionRadio.check()
		await expect(additionRadio).toBeChecked()

		// Arrow down should move to next radio
		await page.keyboard.press('ArrowDown')
		const subtractionRadio = page.getByRole('radio', {
			name: 'Subtraksjon'
		})
		await expect(subtractionRadio).toBeChecked()

		await page.keyboard.press('ArrowDown')
		const multiplicationRadio = page.getByRole('radio', {
			name: 'Multiplikasjon'
		})
		await expect(multiplicationRadio).toBeChecked()
	})

	test('start quiz with Enter key on Start button', async ({ page }) => {
		await installFastTimers(page)
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Select an operator
		await page.getByRole('radio', { name: 'Addisjon' }).check()
		await page.getByRole('radio', { name: 'Automatisk' }).check()

		// Focus and press Enter on Start button
		const startButton = page.getByRole('button', { name: 'Start' })
		await startButton.focus()
		await page.keyboard.press('Enter')

		// Should enter quiz mode
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 5_000 })
	})

	test('type answer and submit with Enter during quiz', async ({ page }) => {
		await startQuiz(page)

		const puzzle = await readPuzzle(page)
		await page.keyboard.type(solvePuzzle(puzzle).toString())
		await page.keyboard.press('Enter')

		// Should advance to puzzle 2
		await expect(page.getByText('Oppgave 2')).toBeVisible({ timeout: 5_000 })
	})

	test('backspace clears digit during quiz', async ({ page }) => {
		await startQuiz(page)

		// Type a digit, then backspace
		await page.keyboard.type('9')
		const expression = page.getByTestId('puzzle-expression')
		await expect(expression).toContainText('9')

		await page.keyboard.press('Backspace')
		await expect(expression).toContainText('?')
	})

	test('cancel flow aborts quiz via keyboard', async ({ page }) => {
		await startQuiz(page)

		await page.getByTitle('Angre').click()
		await expect(page.getByText('Avslutt?')).toBeVisible()
		await page.getByRole('button', { name: 'Ja' }).click()

		await expect(
			page.getByRole('heading', { name: 'Velg regneart' })
		).toBeVisible({ timeout: 5_000 })
	})

	test('complete unlimited quiz with keyboard', async ({ page }) => {
		await startQuiz(page, { url: '/?duration=0' })

		// Solve a few puzzles
		for (let i = 0; i < 3; i++) {
			const puzzle = await readPuzzle(page)
			await submitAnswer(page, solvePuzzle(puzzle))
			await expect(page.getByText(`Oppgave ${i + 2}`)).toBeVisible({
				timeout: 5_000
			})
		}

		// Click complete button (✓) by its title
		await page.getByTitle('Fullfør quiz').click()

		// Should show results
		await expect(page.getByText('Resultater')).toBeVisible({ timeout: 5_000 })
	})

	test('results screen navigable with Tab and Enter', async ({ page }) => {
		await reachResults(page)

		// Tab to Start button on results screen and press Enter
		const startButton = page.getByRole('button', { name: 'Start' })
		await startButton.focus()
		await page.keyboard.press('Enter')

		// Should start a new quiz
		await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7_000 })
	})

	test('results screen Menu button navigable with keyboard', async ({
		page
	}) => {
		await reachResults(page)

		// Focus and activate Menu button
		const menuButton = page.getByRole('button', { name: 'Meny' })
		await menuButton.focus()
		await page.keyboard.press('Enter')

		await expect(
			page.getByRole('heading', { name: 'Velg regneart' })
		).toBeVisible()
	})

	test('skill dialog opens and closes with keyboard', async ({ page }) => {
		// Seed adaptive skills so percentage button renders
		await page.addInitScript(() => {
			localStorage.setItem(
				'regneflyt.adaptive-profiles.v1',
				JSON.stringify([80, 60, 40, 20])
			)
		})
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Tab to the skill percentage button and open with Enter
		const skillButton = page.getByRole('button', { name: /\d+%/ })
		await skillButton.focus()
		await page.keyboard.press('Enter')
		await expect(page.getByRole('dialog')).toBeVisible()

		// ESC should close dialog
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('share dialog opens and closes with keyboard', async ({ page }) => {
		await page.goto('/?operator=0&difficulty=1&showSettings=true')
		await page.waitForLoadState('networkidle')

		// Open share dialog
		const actionRow = page.getByTestId('menu-actions')
		const shareButton = actionRow
			.getByRole('button', { name: /^Del$/i })
			.first()
		await shareButton.focus()
		await page.keyboard.press('Enter')
		await expect(page.getByRole('dialog')).toBeVisible()

		// Title input should be focused
		const titleInput = page.getByRole('dialog').locator('input[type="text"]')
		await expect(titleInput).toBeFocused()

		// Type a title
		await page.keyboard.type('Min test')
		await expect(titleInput).toHaveValue('Min test')

		// ESC to close
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('negative answer input via minus key', async ({ page }) => {
		await startQuiz(page, { operator: 'Subtraksjon' })

		// Press minus to start negative number
		await page.keyboard.press('-')
		const expression = page.getByTestId('puzzle-expression')
		await expect(expression).toContainText('-')

		// Type a digit after minus
		await page.keyboard.type('5')
		await expect(expression).toContainText('-5')
	})
})
