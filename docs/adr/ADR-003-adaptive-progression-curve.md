# ADR-003: Adaptive Progression Curve

**Status:** Accepted  
**Date:** 2026-05-15  
**Context:** Designing smooth skill progression from novice (skill=0) to expert (skill=100+) without grinding burnout or difficulty cliffs.

## Problem

Three critical transition points need smooth, predictable behavior:

1. **Early grinding (skill 0–40):** How to encourage progress through trivial puzzles without making them too rewarding?
2. **Endgame ceiling (skill 60–100):** How to reward mastery while preventing infinite grinding?
3. **Puzzle mode shifts (Normal → Alternate → Random):** How to avoid sudden cognitive load increases?

## Decision

Implement **three complementary mechanisms**:

### 1. Calibration Boost (skill 0–40)

Apply 1.1× multiplier that linearly tapers from skill 0 to skill 50:

- **Rationale:** Early puzzles are mostly trivial. Without boost, students grind for 100+ puzzles. With boost, progress to skill 40 in ~20 puzzles. Smooth taper avoids discontinuity.
- **Tuning:** 1.1× chosen empirically; boosts were 1.15× caused excessive skipping of useful practice.

### 2. High-Skill Taper (skill 60–100+)

Apply multiplier that linearly decreases from 1.0× to 0.35×:

- **Rationale:** Mastery is worth celebrating but not infinitely rewarding. At skill 100, students should earn 35% of normal gains. Linear taper prevents plateaus.
- **Tuning:** 0.35× is floor; tested 0.25× and 0.5× but 0.35× balances reward/effort best.

### 3. Logistic Mode Transitions (skill 35 and 60)

Use sigmoid curves for smooth Normal → Alternate → Random shifts:

- $P(\text{mode}) = \frac{1}{1 + e^{-(\text{skill} - \text{midpoint}) / (\text{spread} / 4)}}$
- Spread=10 creates 10–15 skill-point "gray zone" where both modes are possible
- **Rationale:** Gradual cognitive adaptation is more effective than abrupt switches. Gray zones allow variety while maintaining skill-appropriate challenge.

## Consequences

**Positive:**

- Smooth curves prevent frustration: no sudden drops in gain rates or difficulty jumps
- Balanced reward: early grinding is fast, endgame is achievable, grind-to-100 is hard
- Tunable: can adjust calibration boost or taper rate if empirical data suggests change

**Negative:**

- Non-obvious tuning: why 0.35× not 0.4×? Requires domain expertise
- Sigmoid curves add complexity: harder for new developers to reason about
- Multiple transitions interact: changing taperThreshold affects high-skill puzzle acceptance

**Mitigation:**

- Comprehensive regression matrix: validates all three mechanisms interact smoothly
- ADAPTIVE_ALGORITHM.md documents rationale for each threshold
- Measurement guide explains how to detect progression curve issues (e.g., "students plateau at skill 50")
