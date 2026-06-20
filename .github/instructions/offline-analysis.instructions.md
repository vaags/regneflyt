---
description: 'Use when changing offline analysis CLI flow, analysis helper behavior, tuning-compare workflows, or related docs and tests.'
name: 'Regneflyt Offline Analysis'
applyTo: 'scripts/offline-analysis.mjs,src/lib/helpers/analysis/**/*.ts,src/lib/models/AdaptiveProfile.ts,tests/unit/offlineAnalysisHelper.test.ts,docs/TUNING_MEASUREMENT_GUIDE.md,README.md,package.json'
---

# Regneflyt Offline Analysis Rules

- Run offline analysis for tuning-impact changes before finalizing recommendations.
- For baseline-only checks, run `npm run analyze:offline` with explicit `--seed` and `--title`.
- For candidate comparisons, run `npm run analyze:compare` with both `--baseline-tuning` and `--candidate-tuning`; do not infer missing files.
- Use multi-seed evidence for tuning recommendations. Default to at least seeds 1, 42, and 99.
- Include both per-operator runs and all-operator runs before recommending tuning changes.
- Report correctness and progression together. Do not recommend a candidate from mean skill delta alone.
- Save outputs via `--out` and cite artifact paths in summaries when commands are run.
- Treat tuning schema validation failures as blocking for compare conclusions until input files are corrected.
- Keep comparison claims deterministic: fixed seeds, fixed scenario settings, and explicit baseline/candidate provenance.
