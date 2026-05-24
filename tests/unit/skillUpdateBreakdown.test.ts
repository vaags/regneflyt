import { describe, expect, it } from 'vitest'
import {
	getSkillUpdateBreakdown,
	getUpdatedSkill
} from '$lib/helpers/adaptiveSkillUpdate'

describe('getSkillUpdateBreakdown', () => {
	it('returns calibration boost > 1 at low skill', () => {
		const b = getSkillUpdateBreakdown(0, true, 2, 1, 0)
		expect(b.isCorrect).toBe(true)
		if (!b.isCorrect) return
		expect(b.calibrationMultiplier).toBeGreaterThan(1)
		expect(b.newSkill).toBeGreaterThan(0)
	})

	it('returns taper < 1 at high skill', () => {
		const b = getSkillUpdateBreakdown(80, true, 2, 1, 0)
		expect(b.isCorrect).toBe(true)
		if (!b.isCorrect) return
		expect(b.highSkillMultiplier).toBeLessThan(1)
	})

	it('blocks gain when difficulty ratio is below gate', () => {
		const b = getSkillUpdateBreakdown(50, true, 2, 0.05, 0)
		expect(b.isCorrect).toBe(true)
		if (!b.isCorrect) return
		expect(b.difficultyGateBlocked).toBe(true)
		expect(b.finalDelta).toBe(0)
		expect(b.newSkill).toBe(50)
	})

	it('applies streak multiplier at 8 consecutive correct', () => {
		const noStreak = getSkillUpdateBreakdown(30, true, 1, 1, 0)
		const withStreak = getSkillUpdateBreakdown(30, true, 1, 1, 8)
		expect(noStreak.isCorrect && withStreak.isCorrect).toBe(true)
		if (!noStreak.isCorrect || !withStreak.isCorrect) return
		expect(withStreak.streakMultiplier).toBeGreaterThan(
			noStreak.streakMultiplier
		)
		expect(withStreak.newSkill).toBeGreaterThan(noStreak.newSkill)
	})

	it('returns penalty breakdown for incorrect answers', () => {
		const b = getSkillUpdateBreakdown(50, false, 5, 1, 0)
		expect(b.isCorrect).toBe(false)
		if (b.isCorrect) return
		expect(b.rawPenalty).toBeGreaterThan(0)
		expect(b.cappedPenalty).toBeGreaterThan(0)
		expect(b.newSkill).toBeLessThan(50)
	})

	it('caps penalty for low-skill incorrect answers', () => {
		const b = getSkillUpdateBreakdown(5, false, 5, 1, 0)
		expect(b.isCorrect).toBe(false)
		if (b.isCorrect) return
		expect(b.cappedPenalty).toBeLessThanOrEqual(b.rawPenalty)
		expect(b.newSkill).toBeGreaterThanOrEqual(0)
	})

	it('produces same newSkill as getUpdatedSkill delegation', () => {
		const cases = [
			[0, true, 2, 1, 0],
			[50, true, 3, 0.8, 5],
			[80, false, 5, 1, 0],
			[30, true, 1, 1, 8]
		] as const
		for (const [skill, correct, dur, ratio, streak] of cases) {
			const breakdown = getSkillUpdateBreakdown(
				skill,
				correct,
				dur,
				ratio,
				streak
			)
			const scalar = getUpdatedSkill(skill, correct, dur, ratio, streak)
			expect(breakdown.newSkill).toBe(scalar)
		}
	})
})
