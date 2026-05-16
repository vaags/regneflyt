# ADR-002: Puzzle Difficulty Scoring

**Status:** Accepted  
**Date:** 2026-05-15  
**Context:** Determining how to quantify puzzle difficulty across different operators (+, −, ×, ÷).

## Problem

Different operators have different difficulty scales:

- Addition/subtraction: difficulty driven by operand size and carry/borrow
- Multiplication/division: difficulty driven by table hardness and factor awkwardness

A single difficulty model cannot fit all operators. Should we use:

1. **Unified model:** One formula for all operators (simple but inaccurate)
2. **Operator-specific models:** Different scoring per operator (complex but accurate)

## Decision

Implement **operator-specific difficulty models**:

**Addition/Subtraction:** Power curves with carry/borrow modifiers

- Base: $\text{difficulty} = 100 \times \left(\frac{\text{operands}}{100}\right)^{1/\text{exponent}}$
- Exponents: 1.9 (addition), 1.9 (subtraction) — sublinear to smooth mid-skill progression
- Carry boost: $(1 + 0.15 \times \text{carryCount})$ — reward regrouping practice
- No-carry discount: 0.9× — simpler mental math

**Multiplication/Division:** Weighted blend of table and factors

- $\text{difficulty} = 0.6 \times \text{tableHardness} + 0.4 \times \text{factorDifficulty}$
- Table hardness from lookup (1×2 ≈ 1, 7×8 ≈ 6)
- Factor difficulty from logarithmic scale
- Identity reduction (0.6×): Acknowledges 7×1 is trivial despite table="7"

## Consequences

**Positive:**

- Accurate difficulty estimates: students at skill=30 get appropriately-difficult puzzles
- Reflects cognitive load: multiplication and division are genuinely different tasks
- Configurable per operator: can tune exponents independently if learning data shows misalignment

**Negative:**

- Four separate code paths: higher maintenance burden
- Harder to reason about globally: "Is skill=40 same difficulty across operators?" (No, but close)
- Parameter tuning is operator-specific: calibrating exponents requires data per operator

**Mitigation:**

- Regression matrix tests validate cross-operator consistency
- Tuning parameters grouped by operator in AdaptiveProfile.ts
- Measurement guide explains how to detect operator-specific drift
