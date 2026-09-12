# Training Model Code Map

This document maps the framework-neutral training model to the source files that implement it. Use it as a starting point before changing skill progression, puzzle difficulty, puzzle generation, or adaptive tuning.

## Main flow

1. `src/routes/quiz/PuzzleView.svelte` calls `getPuzzle(...)` for each new puzzle and applies skill updates after answers.
2. `src/lib/domain/puzzle-generation/puzzleGenerator.ts` is the puzzle-generation façade. It resolves the active operator, effective puzzle mode, skill-based settings, candidate generation, repeat prevention, and final puzzle parts.
3. `src/lib/domain/puzzle-generation/skillBasedPuzzleSettings.ts` translates skill values into concrete puzzle settings and puzzle-mode probabilities.
4. `src/lib/domain/skill-progression/skillProgression.ts` applies a completed puzzle outcome to the appropriate operator skill.
5. `src/lib/domain/skill-progression/skillUpdate.ts` calculates gains, penalties, and the detailed skill-update breakdown.
6. `src/lib/domain/puzzle-generation/puzzleDifficulty.ts` scores generated puzzle difficulty from operator and puzzle parts.
7. `src/lib/domain/puzzle-generation/operatorSelection.ts` selects the active operator, including weighted selection for adaptive all-operators mode.

## Configuration and models

- `src/lib/domain/skill-progression/skillModel.ts` defines skill maps and operator tuple utilities.
- `src/lib/domain/skill-progression/difficultyMode.ts` defines stable custom/adaptive mode IDs and normalization.
- `src/lib/domain/skill-progression/adaptiveTuning.ts` defines adaptive tuning values and scoped analysis overrides.
- `src/lib/domain/skill-progression/adaptiveTuningValidation.ts` enforces adaptive tuning invariants.
- `src/lib/domain/skill-progression/adaptiveTuningDescriptions.ts` describes settings for analysis and review output.
- `src/lib/domain/arithmetic/operator.ts` and `src/lib/domain/puzzle-generation/puzzleMode.ts` define stable domain values.
- `src/lib/domain/puzzle-generation/puzzleGenerationSettings.ts` defines puzzle-generation limits, multiplication/division difficulty metadata, and their validators.
- `src/lib/domain/quiz/quizScoring.ts` defines quiz scoring thresholds such as the Regneflyt star time.

## Persistence and routing boundaries

- `src/lib/models/quizQuerySchema.ts` parses quiz URL query values before they become quiz state.
- `src/lib/helpers/quiz/quizHelper.ts` builds initialized `Quiz` objects and injects persisted skill values at the application boundary.
- `src/lib/models/persistedStoreSchemas.ts` normalizes stored operator skills and replayable result snapshots.
- `src/lib/stores.svelte.ts` persists the operator skill map under the existing compatibility storage key in local storage.

## Analysis and regression support

- `scripts/offline-analysis.mjs` and `src/lib/helpers/analysis/**` run offline tuning analysis.
- `focused `tests/unit/skill*.test.ts`and`tests/unit/puzzle*.test.ts` suites`, `tests/unit/puzzleGenerator.test.ts`, and related regression tests protect adaptive tuning, puzzle generation, skill progression, and deterministic behavior.

## Change guidance

- Preserve `getPuzzle(...)` as the public puzzle-generation façade unless a task explicitly requires API changes.
- Treat RNG call order as behavior. Moving code is safest when it does not change when random values are consumed.
- Use `adaptive` as a modifier for adaptive difficulty behavior, not as the name of the whole subsystem.
- Prefer adding small pure modules around a specific rule over reorganizing the whole training model.
- Run targeted adaptive and puzzle tests after changes, and run `npm run verify` for non-trivial source edits.
