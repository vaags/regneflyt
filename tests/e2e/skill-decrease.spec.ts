import { expect, test, type Page } from '@playwright/test'
import {
	ADAPTIVE_PROFILES_KEY,
	readPuzzle,
	readPuzzleNumber,
	solvePuzzle,
	startQuiz,
	submitAnswer,
	waitForApp,
	waitForNextPuzzle,
	waitForPuzzle
} from './e2eHelpers'

function seedSkillProfiles(page: Page): ReturnType<typeof page.addInitScript> {
	return page.addInitScript((key) => {
		window.localStorage.setItem(key, JSON.stringify([50, 50, 50, 50]))
	}, ADAPTIVE_PROFILES_KEY)
}

async function readStoredSkills(
	page: Page
): Promise<[number, number, number, number]> {
	const raw = await page.evaluate(
		(key) => JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown,
		ADAPTIVE_PROFILES_KEY
	)

	if (
		!Array.isArray(raw) ||
		raw.length < 4 ||
		raw.some((value) => typeof value !== 'number')
	) {
		throw new Error('Expected stored adaptive skills to be a numeric array')
	}

	return [raw[0], raw[1], raw[2], raw[3]]
}

test('skill decreases after wrong answers', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/?duration=0')
	await waitForApp(page)

	// Start quiz with Addition
	await startQuiz(page)
	await waitForPuzzle(page)

	// Submit a wrong answer
	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	const puzzleNumber = await readPuzzleNumber(page)
	await submitAnswer(page, correctAnswer + 999)
	await waitForNextPuzzle(page, puzzleNumber)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
		timeout: 10_000
	})
	await page.getByTestId('btn-complete-yes').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	// Verify skill decreased — read from localStorage
	const [additionSkill] = await readStoredSkills(page)
	expect(additionSkill).toBeLessThan(50)
})

test('skill decreases in custom mode just like adaptive mode', async ({
	page
}) => {
	await seedSkillProfiles(page)
	await page.goto('/?duration=0')
	await waitForApp(page)

	// Select operator first, then switch to custom mode
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-0').check()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	// Submit a wrong answer
	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	const puzzleNumber = await readPuzzleNumber(page)
	await submitAnswer(page, correctAnswer + 999)
	await waitForNextPuzzle(page, puzzleNumber)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
		timeout: 10_000
	})
	await page.getByTestId('btn-complete-yes').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	// Skill should have decreased — single shared profile
	const [firstSkill] = await readStoredSkills(page)
	expect(firstSkill).toBeLessThan(50)
})

test('skill persists correctly after custom mode quiz', async ({ page }) => {
	await page.addInitScript((key) => {
		window.localStorage.setItem(key, JSON.stringify([60, 60, 60, 60]))
	}, ADAPTIVE_PROFILES_KEY)
	await page.goto('/?duration=0')
	await waitForApp(page)

	// Switch to custom mode and start quiz
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-0').check()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	const puzzleNumber = await readPuzzleNumber(page)
	await submitAnswer(page, correctAnswer + 999)
	await waitForNextPuzzle(page, puzzleNumber)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('complete-dialog-heading')).toBeVisible({
		timeout: 10_000
	})
	await page.getByTestId('btn-complete-yes').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	const [additionSkill, subtractSkill, multiplySkill, divideSkill] =
		await readStoredSkills(page)

	// Addition skill should have decreased from 60
	expect(additionSkill).toBeLessThan(60)
	// Other operators should be unchanged
	expect(subtractSkill).toBe(60)
	expect(multiplySkill).toBe(60)
	expect(divideSkill).toBe(60)
})
