import type { adaptiveTuning } from './AdaptiveProfile'

type TuningDescriptions = {
	[G in keyof typeof adaptiveTuning]: {
		[K in keyof (typeof adaptiveTuning)[G] as (typeof adaptiveTuning)[G][K] extends
			| number
			| readonly [number, number]
			? K
			: never]: string
	}
}

export const adaptiveTuningDescriptions = {
	skillBounds: {
		minSkill: 'Floor value for all skill levels.',
		maxSkill: 'Ceiling value clamping all skill levels.'
	},
	operatorMixing: {
		operatorWeightBase:
			'Base weight for weighted random operator selection; higher = all operators chosen more evenly.',
		skillGapDampingFactor:
			"Damping factor reducing each operator's skill when calculating selection weights; higher = stronger catch-up.",
		weakOperatorMinDifficultyBoost:
			"Difficulty points added when an operator's skill is below the gap threshold to accelerate catch-up.",
		weakOperatorGapThreshold:
			'Skill gap below average that triggers the weak-operator difficulty boost.'
	},
	timing: {
		maxDurationSeconds:
			'Base time limit (seconds) for puzzles at minimum skill.',
		maxDurationAtMaxSkill:
			'Time limit (seconds) at maximum skill; interpolated from base based on current skill.'
	},
	penalties: {
		basePenalty: 'Base skill penalty for an incorrect answer.',
		slownessPenaltyBonus:
			'Additional penalty multiplied by how slowly the puzzle was answered.',
		lowSkillPenaltyCapThreshold:
			'Skill level below which penalties are capped to protect early learners.',
		lowSkillPenaltyCapFraction:
			'Caps penalties at this fraction of current skill for players below the threshold.',
		cooldownSteps:
			'Number of same-operator puzzles after an error during which range is reduced to ease recovery.',
		cooldownRangeReduction:
			'Fraction by which puzzle range is reduced during cooldown to make recovery easier.'
	},
	gains: {
		baseSkillGain:
			'Base skill gain for a correct answer before speed and confidence modifiers.',
		speedGainRange:
			'Speed-based gain range from minimum skill to the calibration threshold; higher values reward fluency more strongly.',
		confidenceSpeedBands:
			'Speed-factor band where confidence gain interpolates from careful/slow to fluent response handling.',
		confidenceEffect:
			'Gain adjustment (±) based on response speed within confidence bands.'
	},
	streak: {
		streakBoostThreshold:
			'Consecutive correct answers required to activate the streak bonus.',
		streakBoostMultiplier:
			'Gain multiplier applied when streak threshold is met and response is fast enough.',
		streakBoostMaxSpeedFraction:
			'Response must be within this fraction of max time to qualify for streak bonus.'
	},
	calibration: {
		calibrationThreshold:
			'Skill level where calibration boost stops and normal gains apply.',
		calibrationMaxBoost:
			'Gain multiplier at skill 0, tapering linearly to 1× at the calibration threshold.',
		taperThreshold: 'Skill level where high-skill gain tapering begins.',
		taperMinGain:
			'Gain multiplier at maximum skill; lower values make final progression harder.'
	},
	additionSubtraction: {
		rangeBase: 'Minimum operand range even at skill 0.',
		rangeScale: 'Operand range growth from skill 0 to 100 (via power curve).',
		addSubExponent:
			'Power curve exponent; higher keeps low-skill ranges small and ramps aggressively.',
		lowerBoundScale:
			'Lower bound as a fraction of the upper bound, adjusted by normalized skill.',
		secondOperandSkillLag:
			"Skill points subtracted from the second operand's effective skill, making it progress slower.",
		carryBorrowSkillThreshold:
			'Below this skill level, carry/borrow operations are avoided in puzzle generation.'
	},
	thresholds: {
		minDifficultyRatio:
			'Puzzles below this fraction of player skill yield no skill gain.',
		difficultyWindowOvershoot:
			'Puzzle difficulty is generated within ±this many points of player skill.',
		minWindowSize:
			'If the difficulty window is smaller than this, it is expanded downward.'
	},
	multiplicationDivision: {
		tablesBase: 'Number of multiplication tables unlocked at skill 0.',
		tablesScale:
			'Additional tables unlocked as skill increases (via power curve).',
		tablesExponent: 'Power curve exponent for smooth table unlock progression.',
		tablesDropScale:
			'Fraction of unlock rate at which easiest tables are dropped to keep the active set challenging.',
		factorMin:
			'Absolute floor for the factor range (raised to factorMinAtMaxSkill at high skill).',
		factorMax:
			'Absolute ceiling for the factor range (lowered to factorMaxAtMinSkill at low skill).',
		factorMinAtMaxSkill:
			'Minimum factor at max skill; raised to prevent trivial ×1 puzzles.',
		factorMaxAtMinSkill:
			'Maximum factor at min skill; lowered to keep early multiplication manageable.'
	},
	puzzleMode: {
		alternateMidpoint:
			'Skill level where alternate puzzle mode starts appearing (logistic fade).',
		randomMidpoint:
			'Skill level where random puzzle mode starts appearing (logistic fade).',
		transitionSpread:
			'Controls the smoothness of logistic transitions between puzzle modes.'
	},
	algebraicRollout: {
		algebraicSkillOffset:
			'Subtracted from effective skill when generating algebraic (unknown-part) puzzles.',
		negativeSubStartSkill:
			'Skill level where negative subtraction results start appearing occasionally.',
		negativeSubFullSkill:
			'Skill level where negative subtraction results reach 100% probability.',
		divisorUnknownStartSkill:
			'Skill level where unknown-divisor division problems start appearing.',
		divisorUnknownFullSkill:
			'Skill level where unknown-divisor division problems reach full probability.',
		divisorUnknownProbability:
			'Probability cap for unknown-divisor problems at high skill.'
	},
	difficultyScoring: {
		minorOperandWeight:
			'Weight of the minor operand when computing add/sub difficulty.',
		carryBorrowBoost:
			'Difficulty multiplier boost per carry/borrow in the problem.',
		noCarryDiscount: 'Difficulty reduction when no carries are present.',
		maxTableDifficultyScore:
			'Cap for multiplication table difficulty scores (normalization).',
		addSubBase:
			'Subtracted from effective operand before scaling for difficulty.',
		addScale:
			'Divisor normalizing addition difficulty; higher = more headroom before score saturates.',
		subScale:
			'Divisor normalizing subtraction difficulty; higher = more headroom before score saturates.',
		factorWeight:
			'Weight of the second factor in multiplication/division difficulty blend.',
		identityFactorMultiplier:
			'Reduces factor influence for identity tables (1×n, n/1).',
		mulDivExponent:
			'Power curve for multiplication/division to spread mid-range scores.'
	}
} satisfies TuningDescriptions
