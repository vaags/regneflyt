# Tuning Measurement Guide

This guide explains how to safely measure and validate the impact of changes to adaptive tuning parameters without breaking learning curves or skill progression.

For day-to-day tuning work, prefer the offline analysis commands:

- `npm run analyze:review -- --preset early-game --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json`
- `npm run analyze:review -- --preset foundational --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json`
- `npm run analyze:review -- --preset penalty --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json`
- `npm run analyze:review -- --scope broad --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --title <name>`

These commands run the deterministic analysis helper used by agents and developers.

Use `analyze:review` for most tuning changes because it prints a recommendation block with caveats and emits machine-readable output. Drop to `analyze:compare` or `analyze:matrix` only when you need direct control over the evidence mode.

Lower-level commands remain available for direct control:

- `npm run analyze:offline`
- `npm run analyze:compare -- --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --title <name> --seed <seed>`
- `npm run analyze:matrix -- --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --title <name> --seeds 1,42,99 --operators addition,subtraction,multiplication,division,all`

Use `--scope narrow|broad|foundational` when the default review scope is not obvious. Broad or foundational changes should not be approved from compare-only evidence, even if aggregate deltas look favorable.

Common presets:

- `early-game` for quicker checks on addition/subtraction-heavy changes.
- `foundational` for broad tuning edits that should always run matrix evidence.
- `penalty` for higher-risk penalty and balance changes that need wider coverage.

Phase-aware review output uses existing progression boundaries from adaptive tuning:

- `early`: below the calibration threshold
- `mid`: from calibration threshold up to the taper threshold
- `late`: at or above the taper threshold

Treat phase summaries and phase deltas as additive evidence. In compare mode, read baseline and candidate phase summaries separately before interpreting the phase delta. In matrix mode, phase output is an aggregated phase delta across the selected review runs. A candidate that passes on aggregate deltas but regresses a phase should remain under review until the phase-specific tradeoff is understood.
Phase warnings are gated by minimum phase coverage, so low-sample phase regressions may be suppressed to reduce noise.
Review JSON payloads now include `jsonSchemaVersion` and expose structured recommendation fields such as `recommendation.reason` and, when relevant, `recommendation.suppressedWarnings`.

## Objective

Determine which tuning parameters (e.g., `calibrationMaxBoost`, `taperThreshold`, penalty values) actually drive outcome variance, and quantify the impact of proposed changes before deploying them.

## Tools Available

### 1. Regression Matrix Tests

**Location:** `tests/unit/adaptiveProfile.regression.matrix.test.ts`

**What it does:** Compares golden delta (skill gain) values across thousands of generated scenarios. When you change a tuning parameter, this test catches unexpected side effects.

**How to use:**

```bash
npm run test:unit -- adaptiveProfile.regression.matrix.test.ts --reporter=dot
```

**Interpretation:**

- If all tests pass: Deltas are within expected bounds
- If tests fail: A parameter change caused larger-than-expected shifts in skill gains

### 2. Regression Threshold Tests

**Location:** `tests/unit/adaptiveProfile.regression.thresholds.test.ts`

**What it does:** Validates smooth transitions at critical skill thresholds (calibration at skill 40, taper at skill 60, difficulty ratio at 0.4, etc.).

**How to use:**

```bash
npm run test:unit -- adaptiveProfile.regression.thresholds.test.ts --reporter=dot
```

**Interpretation:**

- If tests pass: Thresholds remain smooth, no discontinuities
- If tests fail: A parameter change introduced a sudden jump in skill gain

### 3. Adaptive Progression E2E Tests

**Location:** `tests/e2e/adaptive-progression.spec.ts`

**What it does:** Simulates multi-puzzle sessions and validates that skill curves follow expected trajectory shapes (smooth, monotonic growth; appropriate endgame deceleration).

**How to use:**

```bash
npm run test:e2e -- --reporter=line tests/e2e/adaptive-progression.spec.ts
```

**Interpretation:**

- If tests pass: Overall learning curves look healthy
- If tests fail: A parameter change distorted progression (e.g., sudden plateaus, grinding loops)

### 4. Seed Distribution Analysis (Manual)

**What it does:** Spot-checks puzzle difficulty distributions and acceptance rates to ensure the fallback logic isn't being triggered excessively.

**How to use:**

1. Enable logging in `src/lib/helpers/puzzleHelper.ts` (e.g., console.log puzzle acceptance rate)
2. Run a quiz with your modified tuning
3. Check that acceptance rate stays in range 70–90% (target range varies by operator)

**Interpretation:**

- Acceptance rate 70–90%: Healthy puzzle selection
- Acceptance rate <70%: Too many puzzles are out-of-window; tighten bounds or relax penalties
- Acceptance rate >95%: Bounds may be too loose; harder to test endgame logic

## Measurement Workflow

### Step 1: Propose a Change

Identify which parameter to modify and why:

Example:

```
Change: Increase calibrationMaxBoost from 1.1 to 1.15
Rationale: Early-stage students are grinding too long. A larger boost will accelerate them past trivial puzzles.
```

### Step 2: Run Regression Tests

Before deploying, run the regression suite to establish baseline deltas:

```bash
npm run test:unit -- adaptiveProfile.regression.matrix.test.ts --reporter=dot
npm run test:unit -- adaptiveProfile.regression.thresholds.test.ts --reporter=dot
```

Record the results. If tests already pass with the old parameter, note the baseline deltas.

### Step 3: Apply the Change

Edit `src/lib/models/AdaptiveProfile.ts` and update the parameter:

```typescript
// Before
calibrationMaxBoost: 1.1,

// After
calibrationMaxBoost: 1.15,
```

### Step 4: Re-run Regression Tests

After the change:

```bash
npm run test:unit -- adaptiveProfile.regression.matrix.test.ts --reporter=dot
npm run test:unit -- adaptiveProfile.regression.thresholds.test.ts --reporter=dot
```

**Evaluate the delta:**

- **Δ ≤ 0.1:** Minimal impact; safe to deploy
- **0.1 < Δ ≤ 0.5:** Moderate impact; review affected skill cohorts before deploying
- **Δ > 0.5:** Large impact; requires A/B testing or careful validation

### Step 5: Run Adaptive Progression E2E

Validate that learning curves remain smooth:

```bash
npm run test:e2e -- --reporter=line tests/e2e/adaptive-progression.spec.ts
```

If this test fails, the parameter change introduced unexpected behavior.

### Step 6: Spot-Check Puzzle Acceptance (Optional)

For high-risk changes (e.g., modifying penalty constants), manually verify that:

- Puzzle acceptance rates stay 70–90%
- No operator is systematically over/under-generating puzzles
- Fallback logic (for high-skill mul/div) activates sparingly (<5% of time)

## Example: Changing calibrationMaxBoost

### Before Change

```bash
$ npm run test:unit -- adaptiveProfile.regression.matrix.test.ts
# Result: All tests pass, deltas are stable
```

### Change

In `AdaptiveProfile.ts`, change:

```typescript
calibrationMaxBoost: 1.1 // was 1.1
```

To:

```typescript
calibrationMaxBoost: 1.15 // now 1.15
```

### After Change

```bash
$ npm run test:unit -- adaptiveProfile.regression.matrix.test.ts
# Result: Fails with delta shift of +0.3 at skill 0–40 cohort

$ npm run test:unit -- adaptiveProfile.regression.thresholds.test.ts
# Result: Passes; calibration threshold remains smooth

$ npm run test:e2e -- --reporter=line tests/e2e/adaptive-progression.spec.ts
# Result: Passes; progression curves remain smooth
```

### Interpretation

The change increased early skill gains by ~0.3 points (significant but moderate). Progression curves are still smooth. **Decision:** Safe to deploy with monitoring.

## Example: Changing Penalty Constants

### Before Change

```bash
$ npm run test:unit -- difficultyScoring.test.ts
# Result: All tests pass
```

### Change

In `difficultyScoring.ts`, change:

```typescript
const OUT_OF_WINDOW_PENALTY = 2_500_000 // was 2_000_000
```

### After Change

```bash
$ npm run test:unit -- difficultyScoring.test.ts
# Result: Passes; penalty constants don't have regression tests, only unit tests

$ npm run test:unit -- puzzleHelper.test.ts
# Result: Passes; puzzle generation tests still pass
```

### Interpretation

Penalty constant changes don't affect skill progression directly, only puzzle selection. Monitor that puzzle diversity doesn't degrade (students seeing same puzzles repeatedly). **Decision:** Safe to deploy with UI monitoring for repeat rates.

## Validation Checklist

Before merging a tuning change:

- [ ] Regression delta is within acceptable bounds (Δ ≤ 0.5 for moderate changes)
- [ ] Progression curves remain smooth (e2e adaptive-progression tests pass)
- [ ] Threshold boundaries are continuous (regression.thresholds tests pass)
- [ ] Acceptance rate stays in healthy range (70–90%, varies by operator)
- [ ] No unexpected side effects in related cohorts (e.g., changing taper doesn't break low-skill generation)

## Fallback: Revert Quickly

If a deployed change causes unexpected learning curve distortion:

1. Revert the parameter change in `AdaptiveProfile.ts`
2. Re-run regression tests to confirm revert restores baseline
3. Investigate root cause in follow-up PR
4. Deploy revert immediately

Example:

```bash
# Revert a bad change
git checkout src/lib/models/AdaptiveProfile.ts

# Verify tests pass again
npm run test:unit -- adaptiveProfile.regression.matrix.test.ts
```

## Further Reading

- [Adaptive Algorithm Guide](ADAPTIVE_ALGORITHM.md) — Detailed explanation of multipliers and thresholds
- [ADR-003: Adaptive Progression Curve](adr/ADR-003-adaptive-progression-curve.md) — Rationale for calibration and taper design
- [src/lib/models/AdaptiveProfile.ts](../src/lib/models/AdaptiveProfile.ts) — All tuning constants with semantic comments
