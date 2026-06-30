# Adaptive Engine Code Map

This document maps the adaptive difficulty engine to the source files that implement it. Use it as a starting point before changing puzzle generation, skill updates, or tuning behavior.

## Main flow

1. `src/routes/quiz/PuzzleView.svelte` calls `getPuzzle(...)` for each new puzzle and applies skill updates after answers.
2. `src/lib/helpers/puzzleHelper.ts` is the puzzle-generation façade. It resolves the active operator, effective puzzle mode, adaptive operator settings, candidate generation, repeat prevention, and final puzzle parts.
3. `src/lib/helpers/adaptiveHelper.ts` translates skill values into adaptive puzzle settings and exposes the skill-update entrypoints used by the quiz flow and simulations.
4. `src/lib/helpers/adaptiveSkillUpdate.ts` calculates how a completed puzzle changes one operator skill.
5. `src/lib/helpers/adaptiveDifficultyScoring.ts` scores generated puzzle difficulty from operator and puzzle parts.
6. `src/lib/helpers/operatorResolution.ts` selects the active operator, including weighted selection for adaptive all-operators mode.

## Configuration and models

- `src/lib/models/AdaptiveProfile.ts` defines adaptive difficulty IDs, skill map types, tuning values, scoped tuning overrides for analysis, and tuning invariants.
- `src/lib/models/adaptiveTuningDescriptions.ts` describes tuning values for analysis/review output.
- `src/lib/constants/Operator.ts` and `src/lib/constants/PuzzleMode.ts` define the stable domain enums used throughout the adaptive engine.

## Persistence and routing boundaries

- `src/lib/models/quizQuerySchema.ts` parses quiz URL query values before they become quiz state.
- `src/lib/helpers/quiz/quizHelper.ts` builds initialized `Quiz` objects and injects persisted adaptive skill values.
- `src/lib/models/persistedStoreSchemas.ts` normalizes stored adaptive skills and replayable result snapshots.
- `src/lib/stores.svelte.ts` persists the adaptive skill map in local storage.

## Analysis and regression support

- `scripts/offline-analysis.mjs` and `src/lib/helpers/analysis/**` run offline tuning analysis.
- `tests/unit/adaptiveProfile.*.test.ts`, `tests/unit/puzzleHelper.test.ts`, and related regression tests protect tuning, puzzle generation, skill progression, and deterministic behavior.

## Change guidance

- Preserve `getPuzzle(...)` as the public puzzle-generation façade unless a task explicitly requires API changes.
- Treat RNG call order as behavior. Moving code is safest when it does not change when random values are consumed.
- Prefer adding small pure helpers around a specific rule over reorganizing the whole adaptive engine.
- Run targeted adaptive and puzzle tests after changes, and run `npm run verify` for non-trivial source edits.
