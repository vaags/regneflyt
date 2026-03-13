// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import SkillDialogComponent from '../../src/components/dialogs/SkillDialogComponent.svelte'
import { adaptiveTuning } from '../../src/models/AdaptiveProfile'

vi.mock('$lib/paraglide/messages.js', () => ({
	heading_skill_level: () => 'Skill level',
	heading_puzzles: () => 'Puzzles',
	heading_personal_best: () => 'Personal best',
	label_total: () => 'Total',
	label_puzzles_solved: ({
		correct,
		attempted
	}: {
		correct: string
		attempted: string
	}) => `${correct} of ${attempted}`,
	label_quizzes_completed_one: ({ count }: { count: string }) =>
		`${count} quiz`,
	label_quizzes_completed_other: ({ count }: { count: string }) =>
		`${count} quizzes`,
	label_seconds_unit: () => 'sec',
	operator_addition: () => 'Addition',
	operator_subtraction: () => 'Subtraction',
	operator_multiplication: () => 'Multiplication',
	operator_division: () => 'Division',
	operator_all: () => 'All',
	button_close: () => 'Close'
}))

vi.mock('$lib/paraglide/runtime.js', () => ({
	getLocale: () => 'en'
}))

vi.mock('../../src/stores', async () => {
	const { writable } = await import('svelte/store')
	return {
		adaptiveSkills: writable([60, 40, 80, 20]),
		totalCorrect: writable(42),
		totalAttempted: writable(50),
		totalQuizzes: writable(7),
		personalBests: writable([
			{ bestAccuracy: 95, fastestAvgTime: 2.1 },
			{ bestAccuracy: 80, fastestAvgTime: null },
			{ bestAccuracy: 0, fastestAvgTime: null },
			{ bestAccuracy: 100, fastestAvgTime: 1.5 }
		])
	}
})

describe('SkillDialogComponent', () => {
	afterEach(() => cleanup())

	it('renders skill bars for all four operators', () => {
		const { container } = render(SkillDialogComponent)
		const progressBars = container.querySelectorAll('[role="progressbar"]')
		expect(progressBars).toHaveLength(4)
	})

	it('displays the total skill percentage', () => {
		const skills = [60, 40, 80, 20]
		const expected = Math.round(
			skills.reduce((s, v) => s + v, 0) /
				adaptiveTuning.adaptiveAllOperatorCount
		)
		const { getByTestId } = render(SkillDialogComponent)
		const total = getByTestId('skill-total')
		expect(total.textContent).toContain('Total')
		expect(total.textContent).toContain(`${expected}%`)
	})

	it('displays individual operator skill bars with testIds', () => {
		const { getByTestId } = render(SkillDialogComponent)
		expect(getByTestId('skill-operator-0')).toBeTruthy()
		expect(getByTestId('skill-operator-1')).toBeTruthy()
		expect(getByTestId('skill-operator-2')).toBeTruthy()
		expect(getByTestId('skill-operator-3')).toBeTruthy()
	})

	it('shows puzzles solved when totalAttempted > 0', () => {
		const { container } = render(SkillDialogComponent)
		expect(container.textContent).toContain('42 of 50')
	})

	it('renders a closed dialog element', () => {
		const { container } = render(SkillDialogComponent)
		const dialog = container.querySelector('dialog')
		expect(dialog).toBeTruthy()
		expect(dialog?.hasAttribute('open')).toBe(false)
	})

	it('displays operator labels', () => {
		const { container } = render(SkillDialogComponent)
		expect(container.textContent).toContain('Addition')
		expect(container.textContent).toContain('Subtraction')
		expect(container.textContent).toContain('Multiplication')
		expect(container.textContent).toContain('Division')
	})

	it('shows the dialog heading', () => {
		const { getByTestId } = render(SkillDialogComponent)
		expect(getByTestId('heading-skill-level').textContent).toBe('Skill level')
	})

	it('shows quiz count in stats summary', () => {
		const { getByTestId } = render(SkillDialogComponent)
		const summary = getByTestId('stats-summary')
		expect(summary.textContent).toContain('7 quizzes')
	})

	it('shows personal bests section', () => {
		const { getByTestId } = render(SkillDialogComponent)
		const bests = getByTestId('personal-bests')
		expect(bests.textContent).toContain('Personal best')
		expect(bests.textContent).toContain('Addition')
		expect(bests.textContent).toContain('95%')
		expect(bests.textContent).toContain('Division')
		expect(bests.textContent).toContain('100%')
	})

	it('does not show operator with zero best accuracy', () => {
		const { getByTestId } = render(SkillDialogComponent)
		const bests = getByTestId('personal-bests')
		// Multiplication has bestAccuracy 0, so should not appear
		expect(bests.textContent).not.toContain('Multiplication')
	})
})
