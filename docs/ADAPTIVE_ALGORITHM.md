# Adaptive Algorithm Guide

This document explains how Regneflyt adaptively scales puzzle difficulty based on student skill progression. The system uses a multiplicative skill update model combined with sophisticated difficulty scoring to create a smooth learning curve.

## High-Level Purpose

The adaptive system answers three core questions:

1. **How should skill scores evolve?** A multiplicative formula that combines baseline gains with speed-based feedback and difficulty calibration, preventing both trivial grinding and unfair punishment.
2. **How should puzzle difficulty be calculated?** Separate math for addition/subtraction (power curves with carry modifiers) and multiplication/division (weighted table + factor difficulty blend).
3. **When should puzzle modes transition?** Logistic curves that smoothly shift from Normal → Alternate → Random as skill increases, avoiding abrupt difficulty jumps.

## Skill Update Formula

Skill updates are **multiplicative**, not additive. When a student answers correctly, their skill gain is:

$$\Delta = \lfloor (\text{baseGain} + \text{speedGain}) \times \text{confidence} \times \text{calibration} \times \text{taper} \times \text{difficultyRatio} \times \text{streak} \rfloor$$

### Components

#### Base Gain and Speed Gain

**For incorrect answers** ([src/lib/helpers/adaptiveHelper.ts](src/lib/helpers/adaptiveHelper.ts), `getUpdatedSkill()` function):
$$\text{penalty} = \text{incorrectPenaltyBase} + (\text{slownessFactor} \times \text{incorrectPenaltySlownessFactor})$$

The penalty increases if the student was slow, encouraging both accuracy and thoughtful speed.

**For correct answers** (`getUpdatedSkill()` function):

- **Baseline:** `correctGainBase = 0.9` skill points
- **Speed bonus:** Ramps from `correctGainSpeedFactorAtMinSkill (1.5)` at skill=0 to `correctGainSpeedFactor (3.0)` at calibrationThreshold (40)
- **Formula:** $\text{baseDelta} = 0.9 + \text{speedFactor} \times \text{effectiveSpeedGain}$

Speed gain rewards solving puzzles faster than the average student at that skill level, without penalizing careful work.

#### Confidence Multiplier

Interpolates between 0.9× and 1.1× based on solve time relative to skill-adjusted bands:

- **Fast (0–35% of max time):** 0.9× (encourages verification, not rushing)
- **Medium (35–75%):** Smooth interpolation from 0.9× to 1.1×
- **Slow (75–100%):** 1.1× (rewards persistence, discourages giving up)

This creates a flat zone (0.9–1.0) for fast/medium solves and a gentle boost for thoughtful work, preventing time-based discrimination.

#### Calibration Multiplier

Smooths early progression by boosting gains for trivial puzzles:

$$\text{calibration} = \begin{cases} 1.1 & \text{if } \text{skill} < \text{calibrationThreshold (40)} \\ 1.1 - \frac{0.1}{40} \times \text{skill} & \text{if } \text{skill} \in [40, 50] \\ 1.0 & \text{if } \text{skill} > 50 \end{cases}$$

**Why?** At skill=0–40, students solve mostly trivial puzzles. A 1.1× boost encourages progress through the grinding zone without making late-game gains too easy. The linear taper prevents discontinuities.

#### High-Skill Taper

Reduces gains above skill 60 to prevent endgame grinding from dominating:

$$\text{taper} = \begin{cases} 1.0 & \text{if } \text{skill} < \text{taperThreshold (60)} \\ 1.0 - \frac{0.65}{40} \times (\text{skill} - 60) & \text{if } \text{skill} \in [60, 100] \\ 0.35 & \text{if } \text{skill} > 100 \end{cases}$$

A student at skill 100 earns only 35% of normal gains, rewarding mastery but acknowledging diminishing returns.

#### Difficulty Ratio Gate

Only puzzles above a minimum difficulty threshold earn skill:

$$\text{difficultyRatio} = \frac{\text{puzzleDifficulty} + 1}{\text{skillLevel} + 1}$$

- If $\text{difficultyRatio} < 0.4$: Puzzle is trivial; $\Delta = 0$ (no skill gain)
- If $\text{difficultyRatio} \geq 0.4$: Puzzle is worthwhile; gain scales with ratio

**Why 0.4?** Empirical testing showed this threshold balances skill growth speed with the need to solve warm-up puzzles. It prevents mindless drilling of known content while allowing reasonable practice variety.

#### Streak Bonus

Consecutive correct answers (≥8) within a tight speed window (≤65% of max time) earn a 1.25× multiplier:

$$\text{streak} = \begin{cases} 1.25 & \text{if } \text{consecutiveCorrect} \geq 8 \text{ AND } \text{solveTime} \leq 0.65 \times \text{maxTime} \\ 1.0 & \text{otherwise} \end{cases}$$

**Why?** The streak bonus rewards both consistency and speed, but the speed gate prevents students from grinding easy puzzles slowly and claiming a streak bonus.

## Difficulty Scoring

Puzzle difficulty is calculated differently for each operator, reflecting how human perception of difficulty works.

### Addition & Subtraction

Uses power curves to create a non-linear difficulty scale:

$$\text{baseDifficulty} = 100 \times \left(\frac{\text{normalizedOperands}}{100}\right)^{1/\text{exponent}}$$

- **Addition exponent:** 1.7 (slightly sublinear to reflect how adding larger numbers gets harder faster)
- **Subtraction exponent:** 1.9 (steeper; borrows/regrouping are harder than carries)

**Carry/borrow modifier:**

- Has carry/borrow? Multiply by $(1 + 0.15 \times \text{carryCount})$ to reward practicing with regrouping
- No carry/borrow? Multiply by 0.9 (easier; simpler mental math)

**Trailing zeros:** Stripped before scoring (e.g., 100 + 200 scores as 1 + 2 with +100 bonus) to focus difficulty on the actual regrouping required.

### Multiplication & Division

Blends two difficulty dimensions:

$$\text{difficulty} = 0.6 \times \text{tableHardness} + 0.4 \times \text{factorDifficulty}$$

- **Table hardness:** Pre-computed lookup; 1×2 is trivial (1.0), 7×8 is hard (~6.0)
- **Factor difficulty:** Logarithmic scale; how "awkward" the factors are (e.g., 23 is harder than 20)
- **Identity puzzles** (e.g., 7×1, 12÷1): Factor difficulty reduced by 0.6× to acknowledge trivial cases

### Algebraic Form Penalty

When generating algebraic forms (e.g., "3 + ? = 8"), the system temporarily reduces skill by 15 points during generation. This prevents students from jumping straight to hard algebraic puzzles after mastering normal form.

## Puzzle Mode Transitions

As skill increases, Regneflyt gradually shifts the puzzle format to increase cognitive load:

1. **Normal (skill 0–35):** "3 + 5 = ?" — straightforward calculation
2. **Alternate (skill 35–60):** "3 + ? = 8" or "? − 5 = 2" — requires inverse thinking
3. **Random (skill 60+):** Random position of unknown — mixed cognitive load

Transitions use **logistic sigmoid curves** to avoid sudden difficulty jumps:

$$P(\text{mode}) = \frac{1}{1 + e^{-(\text{skill} - \text{midpoint}) / (\text{spread} / 4)}}$$

- **Normal → Alternate transition:** midpoint=35, spread=10
- **Alternate → Random transition:** midpoint=60, spread=10

The spread of 10 creates a 10–15 skill-point "gray zone" where both modes are possible, allowing gradual cognitive adaptation.

## Puzzle Generation & Repeat Prevention

The puzzle generator aims to create puzzles within a target difficulty window, preventing excessive repeats and allowing adaptive spacing.

### Difficulty Window

The target window is `[skillLevel, skillLevel + 15]`. This allows 15 skill points of overshoot to:

- Stretch students slightly (learning happens near the edge of competence)
- Provide variety when the exact skill level has been exhausted

### Cooldown & Repeat Prevention

Students who answer incorrectly are cooled down from recent operators for 5 subsequent puzzles, forcing practice with other operators. This prevents "operator camping" (repeating the same operator without diversifying).

### Candidate Evaluation & Penalty Hierarchy

When generating a puzzle, the system considers thousands of candidates and scores each:

**Penalty hierarchy** (in severity order):

1. **Out-of-window penalty (2,000,000):** Puzzle falls outside the difficulty window and `prioritizeDifficultyWindow=true`
2. **Repeat penalty (1,000,000):** Puzzle was solved recently (in history)
3. **Unwanted carry penalty (100,000):** Puzzle has carry/borrow when `preferNoCarry=true` (early addition/subtraction)
4. **Continuous penalty:** Proportional to difficulty overshoot/undershoot

The top scorer is selected as the puzzle for the student.

### High-Skill Fallback

For high-skill multiplication/division (skill >60), the solution space becomes sparse. If the main generation loop fails to find an in-window puzzle after 25 attempts, the system relaxes constraints:

- Allows repeats (penalty = 0)
- Allows out-of-window puzzles
- Tries additional samples until the first valid puzzle is found

This ensures students at high skill levels can always receive puzzles, even if they're not perfect fits.

## Tuning Constants & Invariants

Key parameters control the learning curve. See [src/lib/models/AdaptiveProfile.ts](src/lib/models/AdaptiveProfile.ts) for all values:

| Parameter                          | Value | Semantic Meaning                                 |
| ---------------------------------- | ----- | ------------------------------------------------ |
| `calibrationThreshold`             | 40    | Skill at which early speed bonus fully activates |
| `calibrationMaxBoost`              | 1.1   | 10% boost for trivial puzzles (prevent grinding) |
| `taperThreshold`                   | 60    | Skill at which endgame gain reduction begins     |
| `taperMinGain`                     | 0.35  | At skill=100, gains drop to 35% of normal        |
| `minDifficultyThreshold`           | 0.4   | Minimum difficulty ratio to earn skill           |
| `streakBoostThreshold`             | 8     | Consecutive correct answers for 1.25× bonus      |
| `streakBoostMaxSpeedFraction`      | 0.65  | Streak bonus only if answered ≤65% of max time   |
| `adaptiveDifficultyMaxOvershoot`   | 15    | Allow puzzles up to skill+15 in window           |
| `correctGainBase`                  | 0.9   | Baseline skill gain per correct answer           |
| `correctGainSpeedFactorAtMinSkill` | 1.5   | Speed bonus at skill=0                           |
| `correctGainSpeedFactor`           | 3.0   | Speed bonus at skill≥40                          |

Each parameter has been tuned via extensive testing against learning trajectories and empirical skill distributions. Changes should be validated against the regression matrix (see [docs/TUNING_MEASUREMENT_GUIDE.md](docs/TUNING_MEASUREMENT_GUIDE.md)).

## Code References

- **Skill update formula:** [getUpdatedSkill()](src/lib/helpers/adaptiveHelper.ts) in `src/lib/helpers/adaptiveHelper.ts`
- **Difficulty calculation:** [getPuzzleDifficulty()](src/lib/helpers/adaptiveHelper.ts) in `src/lib/helpers/adaptiveHelper.ts`
- **Difficulty ratio gate:** [getDifficultyRatio()](src/lib/helpers/adaptiveHelper.ts) in `src/lib/helpers/adaptiveHelper.ts`
- **Puzzle mode transitions:** [getAdaptivePuzzleMode()](src/lib/helpers/adaptiveHelper.ts) in `src/lib/helpers/adaptiveHelper.ts`
- **Puzzle generation:** [getPuzzle()](src/lib/helpers/puzzleHelper.ts) in `src/lib/helpers/puzzleHelper.ts`
- **Penalty hierarchy & candidate evaluation:** [difficultyScoring.ts](src/lib/helpers/difficultyScoring.ts) and [puzzleCandidateEvaluation.ts](src/lib/helpers/puzzleCandidateEvaluation.ts)
- **Tuning parameters:** [src/lib/models/AdaptiveProfile.ts](src/lib/models/AdaptiveProfile.ts)

## Learning Curve Example

Here's a typical progression for a student learning addition:

1. **Skill 0–10:** Trivial puzzles (1+1, 2+2). Calibration boost (1.1×) + speed bonus → ~1.5 skill/puzzle.
2. **Skill 10–40:** Mixed single-digit addition. Calibration boost still active. Slowly increasing difficulty window.
3. **Skill 40–60:** Double-digit addition with carries. Calibration boost fades. Mode transitions to Alternate at skill 35.
4. **Skill 60–80:** Challenging three-digit problems. Taper reduction starts (0.65×). Mode transitions to Random at skill 60.
5. **Skill 80–100:** Expert-level multi-digit arithmetic. Taper reduction accelerates (0.35× at skill 100).

The multiplicative structure ensures early progress is fast and rewarding while respecting the reality that mastery takes exponential effort.
