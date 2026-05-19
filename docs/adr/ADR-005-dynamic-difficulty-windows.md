# ADR-005: Dynamic Difficulty Windows

**Status:** Accepted  
**Date:** 2026-05-17  
**Context:** Adaptive engine changes to fix high-skill solution space collapse, weak-operator stagnation, and cross-operator calibration fragility.

## Problem

Three structural weaknesses were identified in the adaptive difficulty engine:

1. **Solution space collapse at high skill.** The difficulty window formula `[skill − 15, min(100, skill + 15)]` narrows to just 15 points at skill 100 due to the ceiling clamp. For multiplication/division — where only ~8 active tables × 4 factors exist — this creates a sparse candidate pool, causing the 75-attempt fallback loop to fire frequently.

2. **Weak-operator stagnation in "All" mode.** The weighted operator selection (`weight = max(1, 110 − skill)`) correctly favours weak operators, but the difficulty system still generates puzzles at the operator's raw (low) skill level. These easy puzzles barely advance the operator, so the gap persists.

3. **Calibration fragility.** Four independent difficulty models map to a shared 0–100 scale via hand-tuned constants. Past bugs (subtraction capped at 99, skill 97+ impassable wall) happened because the models drifted silently. Existing alignment tests only cover skills 20–80, missing the critical 90–100 zone.

## Decision

### Dynamic window (asymmetricWindowFloor)

When the ceiling clamp would narrow the difficulty window below `asymmetricWindowFloor` (25 points), extend `minDifficulty` downward: `minDifficulty = max(0, maxDifficulty − asymmetricWindowFloor)`. This guarantees a minimum window width of 25 at all skill levels while keeping low/mid-skill behaviour identical.

The `prioritizeDifficultyWindow` activation zone is widened from `skill ≥ 85` to `skill ≥ 75`, and the fallback attempt count is reduced from 75 to 40 since the wider window reduces candidate starvation.

### Damped operator weights (skillGapDampingFactor)

The weight formula is changed to `max(1, 110 − skill × 0.7)`. At skills [100, 0, 0, 0], the strong operator's share rises from ~2.3% to ~9%, preventing complete starvation while still favouring weak operators.

### Weak-operator difficulty boost (weakOperatorMinDifficultyBoost)

When an operator's skill is ≥ 15 points below the average of all operators in "All" mode, `minDifficulty` is raised by 5 points. This forces slightly harder puzzles for weak operators, accelerating catch-up. The boost is disabled during cooldown (after an incorrect answer) to avoid candidate starvation from conflicting constraints.

### Extended alignment tests

Difficulty alignment tests are extended to skills 90, 95, and 100. New reachability tests verify that all operators can reach skill 100 within a bounded number of attempts. Cross-operator progression parity tests detect scale drift earlier.

## Consequences

**Positive:**

- At skill 100 mul/div, the window widens from [85, 100] to [75, 100], increasing the candidate pool.
- Fallback activation rate drops significantly, reducing generation time variance.
- Weak operators in "All" mode receive harder puzzles that accelerate convergence with strong operators.
- Strong operators maintain ~9% selection share instead of being starved at ~2.3%.
- Alignment tests now cover the full skill range, catching calibration drift in the critical ceiling zone.

**Negative:**

- Slightly easier candidates are accepted at high skill due to the wider window. The `difficultyRatio` mechanism self-corrects by scaling down gains for below-skill puzzles.
- The weak-operator boost adds a conditional path in puzzle generation that must be disabled during cooldown.

**Neutral:**

- Low/mid-skill behaviour (skill < 75) is completely unchanged.
- Golden regression matrix and threshold tests are unaffected since these changes affect puzzle selection, not scoring.
