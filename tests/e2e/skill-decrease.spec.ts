import { expect, test, type Page } from '@playwright/test'
import {
	readPuzzle,
	solvePuzzle,
	submitAnswer,
	waitForApp,
	waitForPuzzle
} from './e2eHelpers'

function seedSkillProfiles(page: Page) {
	return page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify([50, 50, 50, 50])
		)
	})
}

test('skill decreases after wrong answers', async ({ page }) => {
	await seedSkillProfiles(page)
	await page.goto('/?duration=0')
	await waitForApp(page)

	// Verify initial skill shows 50%
	const skillButton = page.getByRole('button', { name: /\d+%/ })
	await expect(skillButton).toHaveText('50%')

	// Start quiz with Addition
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-1').check()
	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	// Submit a wrong answer
	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	await submitAnswer(page, correctAnswer + 999)
	await waitForPuzzle(page)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	// Verify skill decreased — read from localStorage
	const storedSkills = await page.evaluate(() =>
		JSON.parse(
			window.localStorage.getItem('regneflyt.adaptive-profiles.v1') ?? '[]'
		)
	)
	const additionSkill = storedSkills[0]
	expect(additionSkill).toBeLessThan(50)

	// The header skill button should show a lower percentage
	const headerText = await skillButton.innerText()
	const headerSkill = parseInt(headerText)
	expect(headerSkill).toBeLessThan(50)
})

test('skill decreases in custom mode just like adaptive mode', async ({
	page
}) => {
	await seedSkillProfiles(page)
	await page.goto('/?duration=0')
	await waitForApp(page)

	const skillButton = page.getByRole('button', { name: /\d+%/ })
	await expect(skillButton).toHaveText('50%')

	// Select operator first, then switch to custom mode
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-0').check()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	// Submit a wrong answer
	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	await submitAnswer(page, correctAnswer + 999)
	await waitForPuzzle(page)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	// Skill should have decreased — single shared profile
	const storedSkills = await page.evaluate(() =>
		JSON.parse(
			window.localStorage.getItem('regneflyt.adaptive-profiles.v1') ?? '[]'
		)
	)
	expect(storedSkills[0]).toBeLessThan(50)

	const headerText = await skillButton.innerText()
	const headerSkill = parseInt(headerText)
	expect(headerSkill).toBeLessThan(50)
})

test('skill persists correctly after custom mode quiz', async ({ page }) => {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'regneflyt.adaptive-profiles.v1',
			JSON.stringify([60, 60, 60, 60])
		)
	})
	await page.goto('/?duration=0')
	await waitForApp(page)

	// Switch to custom mode and start quiz
	await page.getByTestId('operator-0').check()
	await page.getByTestId('difficulty-0').check()

	await page.getByTestId('btn-start').click()
	await waitForPuzzle(page)

	const puzzle = await readPuzzle(page)
	const correctAnswer = solvePuzzle(puzzle)
	await submitAnswer(page, correctAnswer + 999)
	await waitForPuzzle(page)

	await page.getByTestId('btn-complete-quiz').click()
	await expect(page.getByTestId('heading-results')).toBeVisible({
		timeout: 10_000
	})

	const storedSkills = await page.evaluate(() =>
		JSON.parse(
			window.localStorage.getItem('regneflyt.adaptive-profiles.v1') ?? '[]'
		)
	)

	// Addition skill should have decreased from 60
	expect(storedSkills[0]).toBeLessThan(60)
	// Other operators should be unchanged
	expect(storedSkills[1]).toBe(60)
	expect(storedSkills[2]).toBe(60)
	expect(storedSkills[3]).toBe(60)
})
