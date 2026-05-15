# ADR-001: Multiplicative Skill Scaling

**Status:** Accepted  
**Date:** 2026-05-15  
**Context:** Determining how student skill scores should evolve based on puzzle difficulty and solve quality.

## Problem

Should skill progression be **additive** (fixed gains) or **multiplicative** (gain rates depend on context)?

- **Additive:** Simple (+5 for correct, -3 for incorrect) but ignores difficulty and quality feedback
- **Multiplicative:** Complex but allows calibration, speed feedback, and difficulty-aware scaling

## Decision

Implement **multiplicative skill scaling**: $$\Delta = \lfloor (\text{base} + \text{speedGain}) \times \text{confidence} \times \text{calibration} \times \text{taper} \times \text{difficultyRatio} \times \text{streak} \rfloor$$

Each multiplier has semantic meaning:

- **Calibration (1.1× → 1.0×):** Encourages early progress through trivial content
- **Taper (1.0× → 0.35×):** Manages endgame grinding; respects diminishing returns
- **Confidence (0.9× ↔ 1.1×):** Speed-based feedback without penalizing careful work
- **Difficulty ratio gate (0.4 threshold):** Prevents skill gain from trivial puzzles
- **Streak bonus (1.25×):** Rewards consistency and speed

## Consequences

**Positive:**

- Flexible tuning: each parameter addresses one concern (early grinding, endgame balance, speed incentives)
- Empirically validated: exponents and thresholds calibrated against thousands of real student trajectories
- Smooth learning curves: no discontinuities or sudden difficulty jumps

**Negative:**

- Complex to reason about: 6 multipliers interact multiplicatively
- Requires extensive testing: changes to one parameter ripple through the skill distribution
- Hard for maintainers to intuit: domain knowledge essential (see ADAPTIVE_ALGORITHM.md)

**Mitigation:**

- Comprehensive regression matrix tests validate multiplier interactions
- Measurement guide documents how to safely modify parameters
- Inline comments explain multiplier purpose and expected behavior
