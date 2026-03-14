// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import SkillDialogComponent from '../../src/components/dialogs/SkillDialogComponent.svelte'
import { adaptiveTuning } from '../../src/models/AdaptiveProfile'

vi.mock('$lib/paraglide/messages.js', () => ({
	heading_skill_level: () => 'Skill level',
	label_total: () => 'Total',
	label_seconds_unit: () => 'sec',
	label_streak_days: ({ count }: { count: string }) => `${count} days in a row`,
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
		practiceStreak: writable({ lastDate: '2026-03-14', streak: 5 })
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

	it('shows practice streak when streak >= 2', () => {
		const { getByTestId } = render(SkillDialogComponent)
		const streak = getByTestId('practice-streak')
		expect(streak.textContent).toContain('5 days in a row')
	})
})
