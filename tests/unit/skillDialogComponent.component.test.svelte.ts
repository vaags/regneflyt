// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/svelte'
import { adaptiveTuning } from '$lib/models/AdaptiveProfile'
import { heading_skill_level, label_total } from '$lib/paraglide/messages.js'
import { overwriteGetLocale } from '$lib/paraglide/runtime.js'

vi.mock('$lib/stores', async () => {
	const { derived, fromStore, writable } = await import('svelte/store')
	const adaptiveSkills = writable([60, 40, 80, 20])
	return {
		adaptiveSkills: fromStore(adaptiveSkills),
		overallSkill: fromStore(
			derived(adaptiveSkills, ($skills) =>
				Math.round($skills.reduce((s: number, v: number) => s + v, 0) / 4)
			)
		),
		practiceStreak: fromStore(writable({ lastDate: '2026-03-14', streak: 5 }))
	}
})

import SkillDialogComponent from '$lib/components/dialogs/SkillDialogComponent.svelte'

describe('SkillDialogComponent', () => {
	beforeEach(() => {
		overwriteGetLocale(() => 'en')
	})

	afterEach(() => {
		cleanup()
	})

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

	it('updates localized copy when locale prop changes while mounted', async () => {
		const { getByTestId, rerender } = render(SkillDialogComponent, {
			locale: 'en'
		})

		expect(getByTestId('heading-skill-level').textContent).toBe(
			heading_skill_level({}, { locale: 'en' })
		)
		expect(getByTestId('skill-total').textContent).toContain(
			label_total({}, { locale: 'en' })
		)

		await rerender({ locale: 'nb' })

		expect(getByTestId('heading-skill-level').textContent).toBe(
			heading_skill_level({}, { locale: 'nb' })
		)
		expect(getByTestId('skill-total').textContent).toContain(
			label_total({}, { locale: 'nb' })
		)
	})
})
