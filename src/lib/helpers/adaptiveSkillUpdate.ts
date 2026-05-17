import {
	adaptiveTuning,
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
	if (
		!Array.isArray(value) ||
		value.length !== adaptiveTuning.skillBounds.adaptiveAllOperatorCount
	)
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
 * Clamps a skill value to the valid range [{@link adaptiveTuning.skillBounds.minSkill}, {@link adaptiveTuning.skillBounds.maxSkill}].
 * Non-finite values fall back to {@link adaptiveTuning.skillBounds.minSkill}.
 *
 * @param skill - Raw skill number to clamp
 * @returns Integer skill in the valid range
 */
export function clampSkill(skill: number): number {
	if (!Number.isFinite(skill)) return adaptiveTuning.skillBounds.minSkill

	return Math.max(
		adaptiveTuning.skillBounds.minSkill,
		Math.min(adaptiveTuning.skillBounds.maxSkill, Math.round(skill))
	)
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
	const normalizedSkill = clampSkill(skill)

	// Scale max allowed time with skill level - harder puzzles deserve more time
	const effectiveMaxDuration = getEffectiveMaxDuration(normalizedSkill)

	if (!isCorrect) {
		const clampedDuration = clampDuration(durationSeconds, effectiveMaxDuration)
		const slownessFactor = clampedDuration / effectiveMaxDuration
		const rawPenalty = Math.round(
			adaptiveTuning.penalties.incorrectPenaltyBase +
				slownessFactor * adaptiveTuning.penalties.incorrectPenaltySlownessFactor
		)
		const lowSkillPenaltyCap = Math.floor(
			normalizedSkill * adaptiveTuning.penalties.lowSkillPenaltyCapFraction
		)
		const penalty =
			normalizedSkill < adaptiveTuning.penalties.lowSkillPenaltyCapThreshold
				? Math.min(rawPenalty, lowSkillPenaltyCap)
				: rawPenalty
		return clampSkill(normalizedSkill - penalty)
	}

	// Puzzles well below the player's level grant no skill
	if (difficultyRatio < adaptiveTuning.thresholds.minDifficultyThreshold) {
		return normalizedSkill
	}

	const clampedDuration = clampDuration(durationSeconds, effectiveMaxDuration)
	const speedFactor =
		(effectiveMaxDuration - clampedDuration) / effectiveMaxDuration
	const confidenceMultiplier = getConfidenceGainMultiplier(speedFactor)
	// Scale the speed bonus with skill: answering easy puzzles fast
	// earns less than answering hard puzzles fast.
	const effectiveSpeedGain = getEffectiveSpeedGain(normalizedSkill)
	const baseDelta =
		adaptiveTuning.gains.correctGainBase + speedFactor * effectiveSpeedGain
	const safeDifficultyRatio = Math.max(0, Math.min(1, difficultyRatio))
	const streakMultiplier = getStreakMultiplier(
		clampedDuration,
		effectiveMaxDuration,
		consecutiveCorrect
	)
	const calibrationMultiplier = getCalibrationBoost(normalizedSkill)
	const highSkillMultiplier = getHighSkillTaper(normalizedSkill)

	// Apply each multiplier explicitly so tuning changes are easier to reason about.
	const delta = Math.max(
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

	return clampSkill(normalizedSkill + delta)
}

function getEffectiveMaxDuration(skill: number): number {
	return (
		adaptiveTuning.timing.maxDurationSeconds +
		(adaptiveTuning.timing.maxDurationSecondsAtMaxSkill -
			adaptiveTuning.timing.maxDurationSeconds) *
			(skill / adaptiveTuning.skillBounds.maxSkill)
	)
}

function clampDuration(
	durationSeconds: number,
	effectiveMaxDuration: number
): number {
	return Math.max(
		adaptiveTuning.timing.minDurationSeconds,
		Math.min(effectiveMaxDuration, durationSeconds)
	)
}

function getEffectiveSpeedGain(skill: number): number {
	if (skill >= adaptiveTuning.calibration.calibrationThreshold) {
		return adaptiveTuning.gains.correctGainSpeedFactor
	}

	return (
		adaptiveTuning.gains.correctGainSpeedFactorAtMinSkill +
		(skill / adaptiveTuning.calibration.calibrationThreshold) *
			(adaptiveTuning.gains.correctGainSpeedFactor -
				adaptiveTuning.gains.correctGainSpeedFactorAtMinSkill)
	)
}

function getStreakMultiplier(
	clampedDuration: number,
	effectiveMaxDuration: number,
	consecutiveCorrect: number
): number {
	const isFastEnoughForStreak =
		clampedDuration <=
		effectiveMaxDuration * adaptiveTuning.streak.streakBoostMaxSpeedFraction

	return consecutiveCorrect >= adaptiveTuning.streak.streakBoostThreshold &&
		isFastEnoughForStreak
		? adaptiveTuning.streak.streakBoostMultiplier
		: 1
}

// Linear boost that tapers to 1x at the calibration threshold.
// Prevents new players from grinding dozens of trivial puzzles before
// the difficulty catches up to their actual level.
function getCalibrationBoost(skill: number): number {
	const { calibrationThreshold, calibrationMaxBoost } =
		adaptiveTuning.calibration
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
	const { taperThreshold, taperMinGain } = adaptiveTuning.calibration
	const { maxSkill } = adaptiveTuning.skillBounds
	if (skill <= taperThreshold) return 1

	return (
		1 -
		((skill - taperThreshold) / (maxSkill - taperThreshold)) *
			(1 - taperMinGain)
	)
}

function getConfidenceGainMultiplier(speedFactor: number): number {
	const clampedSpeed = Math.max(0, Math.min(1, speedFactor))
	const [confidenceLowSpeedFraction, confidenceHighSpeedFraction] =
		adaptiveTuning.gains.confidenceSpeedRange
	const [confidenceLowGainMultiplier, confidenceHighGainMultiplier] =
		adaptiveTuning.gains.confidenceGainRange

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
