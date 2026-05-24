import {
	adaptiveInternals,
	getActiveTuning,
	defaultAdaptiveSkillMap,
	type AdaptiveSkillMap
} from '$lib/models/AdaptiveProfile'

/**
 * Guards against corrupted or tampered localStorage data.
 * Returns a safe default if the shape is wrong, clamps each value otherwise.
 *
 * @param value - Raw value read from storage (unknown shape)
 * @returns A valid, clamped 4-element skill array
 */
export function sanitizeAdaptiveSkillMap(value: unknown): AdaptiveSkillMap {
	if (!Array.isArray(value) || value.length !== adaptiveInternals.operatorCount)
		return [
			defaultAdaptiveSkillMap[0],
			defaultAdaptiveSkillMap[1],
			defaultAdaptiveSkillMap[2],
			defaultAdaptiveSkillMap[3]
		]

	return [
		clampSkill(Number(value[0])),
		clampSkill(Number(value[1])),
		clampSkill(Number(value[2])),
		clampSkill(Number(value[3]))
	]
}

/**
 * Clamps a skill value to the valid range defined by the active tuning's
 * `skillBounds.minSkill` and `skillBounds.maxSkill`.
 * Non-finite values fall back to `skillBounds.minSkill`.
 *
 * @param skill - Raw skill number to clamp
 * @returns Integer skill in the valid range
 */
export function clampSkill(skill: number): number {
	const t = getActiveTuning()
	if (!Number.isFinite(skill)) return t.skillBounds.minSkill

	return Math.max(
		t.skillBounds.minSkill,
		Math.min(t.skillBounds.maxSkill, Math.round(skill))
	)
}

export type SkillUpdateBreakdown =
	| {
			isCorrect: true
			difficultyGateBlocked: boolean
			baseDelta: number
			confidenceMultiplier: number
			calibrationMultiplier: number
			highSkillMultiplier: number
			difficultyRatio: number
			streakMultiplier: number
			finalDelta: number
			newSkill: number
	  }
	| {
			isCorrect: false
			rawPenalty: number
			cappedPenalty: number
			newSkill: number
	  }

/**
 * Core skill update - called after every puzzle answer.
 * Rewards speed on correct answers; penalises wrong answers more when slow.
 * A calibration boost accelerates early progress so beginners aren't bored.
 * {@link difficultyRatio} (0-1) scales gains so easy puzzles at high skill yield less.
 *
 * @param skill - Current skill level (0-100)
 * @param isCorrect - Whether the answer was correct
 * @param durationSeconds - Time spent answering
 * @param difficultyRatio - Ratio of puzzle difficulty to player skill (0-1)
 * @param consecutiveCorrect - Number of consecutive correct answers (for streak boost)
 * @returns Updated skill value, clamped to valid range
 */
export function getUpdatedSkill(
	skill: number,
	isCorrect: boolean,
	durationSeconds: number,
	difficultyRatio = 1,
	consecutiveCorrect = 0
): number {
	return getSkillUpdateBreakdown(
		skill,
		isCorrect,
		durationSeconds,
		difficultyRatio,
		consecutiveCorrect
	).newSkill
}

/**
 * Returns the full breakdown of a skill update including all intermediate
 * multipliers. Used by the simulation UI to make the algorithm observable.
 */
export function getSkillUpdateBreakdown(
	skill: number,
	isCorrect: boolean,
	durationSeconds: number,
	difficultyRatio = 1,
	consecutiveCorrect = 0
): SkillUpdateBreakdown {
	const t = getActiveTuning()
	const normalizedSkill = clampSkill(skill)

	// Scale max allowed time with skill level - harder puzzles deserve more time
	const effectiveMaxDuration = getEffectiveMaxDuration(normalizedSkill)

	if (!isCorrect) {
		const clampedDuration = clampDuration(durationSeconds, effectiveMaxDuration)
		const slownessFactor = clampedDuration / effectiveMaxDuration
		const rawPenalty = Math.round(
			t.penalties.basePenalty +
				slownessFactor * t.penalties.slownessPenaltyBonus
		)
		const lowSkillPenaltyCap = Math.floor(
			normalizedSkill * t.penalties.lowSkillPenaltyCapFraction
		)
		const cappedPenalty =
			normalizedSkill < t.penalties.lowSkillPenaltyCapThreshold
				? Math.min(rawPenalty, lowSkillPenaltyCap)
				: rawPenalty
		return {
			isCorrect: false,
			rawPenalty,
			cappedPenalty,
			newSkill: clampSkill(normalizedSkill - cappedPenalty)
		}
	}

	// Puzzles well below the player's level grant no skill
	if (difficultyRatio < t.thresholds.minDifficultyRatio) {
		return {
			isCorrect: true,
			difficultyGateBlocked: true,
			baseDelta: 0,
			confidenceMultiplier: 1,
			calibrationMultiplier: 1,
			highSkillMultiplier: 1,
			difficultyRatio,
			streakMultiplier: 1,
			finalDelta: 0,
			newSkill: normalizedSkill
		}
	}

	const clampedDuration = clampDuration(durationSeconds, effectiveMaxDuration)
	const speedFactor =
		(effectiveMaxDuration - clampedDuration) / effectiveMaxDuration
	const confidenceMultiplier = getConfidenceGainMultiplier(speedFactor)
	// Scale the speed bonus with skill: answering easy puzzles fast
	// earns less than answering hard puzzles fast.
	const effectiveSpeedGain = getEffectiveSpeedGain(normalizedSkill)
	const baseDelta = t.gains.baseSkillGain + speedFactor * effectiveSpeedGain
	const safeDifficultyRatio = Math.max(0, Math.min(1, difficultyRatio))
	const streakMultiplier = getStreakMultiplier(
		clampedDuration,
		effectiveMaxDuration,
		consecutiveCorrect
	)
	const calibrationMultiplier = getCalibrationBoost(normalizedSkill)
	const highSkillMultiplier = getHighSkillTaper(normalizedSkill)

	// Apply each multiplier explicitly so tuning changes are easier to reason about.
	const finalDelta = Math.max(
		1,
		Math.floor(
			baseDelta *
				confidenceMultiplier *
				calibrationMultiplier *
				highSkillMultiplier *
				safeDifficultyRatio *
				streakMultiplier
		)
	)

	return {
		isCorrect: true,
		difficultyGateBlocked: false,
		baseDelta,
		confidenceMultiplier,
		calibrationMultiplier,
		highSkillMultiplier,
		difficultyRatio: safeDifficultyRatio,
		streakMultiplier,
		finalDelta,
		newSkill: clampSkill(normalizedSkill + finalDelta)
	}
}

function getEffectiveMaxDuration(skill: number): number {
	const t = getActiveTuning()
	return (
		t.timing.maxDurationSeconds +
		(t.timing.maxDurationAtMaxSkill - t.timing.maxDurationSeconds) *
			(skill / t.skillBounds.maxSkill)
	)
}

function clampDuration(
	durationSeconds: number,
	effectiveMaxDuration: number
): number {
	return Math.max(
		adaptiveInternals.minDurationSeconds,
		Math.min(effectiveMaxDuration, durationSeconds)
	)
}

function getEffectiveSpeedGain(skill: number): number {
	const t = getActiveTuning()
	const [minSpeedGain, maxSpeedGain] = t.gains.speedGainRange
	if (skill >= t.calibration.calibrationThreshold) {
		return maxSpeedGain
	}

	return (
		minSpeedGain +
		(skill / t.calibration.calibrationThreshold) * (maxSpeedGain - minSpeedGain)
	)
}

function getStreakMultiplier(
	clampedDuration: number,
	effectiveMaxDuration: number,
	consecutiveCorrect: number
): number {
	const t = getActiveTuning()
	const isFastEnoughForStreak =
		clampedDuration <=
		effectiveMaxDuration * t.streak.streakBoostMaxSpeedFraction

	return consecutiveCorrect >= t.streak.streakBoostThreshold &&
		isFastEnoughForStreak
		? t.streak.streakBoostMultiplier
		: 1
}

// Linear boost that tapers to 1x at the calibration threshold.
// Prevents new players from grinding dozens of trivial puzzles before
// the difficulty catches up to their actual level.
function getCalibrationBoost(skill: number): number {
	const t = getActiveTuning()
	const { calibrationThreshold, calibrationMaxBoost } = t.calibration
	if (skill >= calibrationThreshold) return 1

	return (
		1 +
		((calibrationThreshold - skill) / calibrationThreshold) *
			(calibrationMaxBoost - 1)
	)
}

// Linear taper that reduces gain above the taper threshold.
// Makes the final stretch to max skill require sustained accuracy and speed.
function getHighSkillTaper(skill: number): number {
	const t = getActiveTuning()
	const { taperThreshold, taperMinGain } = t.calibration
	const { maxSkill } = t.skillBounds
	if (skill <= taperThreshold) return 1

	return (
		1 -
		((skill - taperThreshold) / (maxSkill - taperThreshold)) *
			(1 - taperMinGain)
	)
}

function getConfidenceGainMultiplier(speedFactor: number): number {
	const t = getActiveTuning()
	const clampedSpeed = Math.max(0, Math.min(1, speedFactor))
	const [confidenceLowSpeedFraction, confidenceHighSpeedFraction] =
		t.gains.confidenceSpeedBands
	const confidenceLowGainMultiplier = 1 - t.gains.confidenceEffect
	const confidenceHighGainMultiplier = 1 + t.gains.confidenceEffect

	if (clampedSpeed <= confidenceLowSpeedFraction) {
		return confidenceLowGainMultiplier
	}

	if (clampedSpeed >= confidenceHighSpeedFraction) {
		return confidenceHighGainMultiplier
	}

	const progress =
		(clampedSpeed - confidenceLowSpeedFraction) /
		(confidenceHighSpeedFraction - confidenceLowSpeedFraction)

	return (
		confidenceLowGainMultiplier +
		progress * (confidenceHighGainMultiplier - confidenceLowGainMultiplier)
	)
}
