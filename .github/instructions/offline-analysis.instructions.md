---
description: 'Use when changing offline analysis CLI flow, analysis helper behavior, tuning-compare workflows, or related docs and tests.'
name: 'Regneflyt Offline Analysis'
applyTo: 'scripts/offline-analysis.mjs,src/lib/helpers/analysis/**/*.ts,src/lib/models/AdaptiveProfile.ts,tests/unit/offlineAnalysisHelper.test.ts,docs/TUNING_MEASUREMENT_GUIDE.md,README.md,package.json'
---

# Regneflyt Offline Analysis Rules

- Run offline analysis for tuning-impact changes before finalizing recommendations.
- Prefer `npm run analyze:review` for day-to-day tuning review; use compare or matrix only when you need direct mode control.
- Use the small preset set in review mode when it matches the change: `early-game`, `foundational`, or `penalty`.
- For baseline-only checks, run `npm run analyze:offline` with explicit `--seed` and `--title`.
- For candidate comparisons, run `npm run analyze:compare` with both `--baseline-tuning` and `--candidate-tuning`; do not infer missing files.
- Use multi-seed evidence for tuning recommendations. Default to at least seeds 1, 42, and 99.
- Include both per-operator runs and all-operator runs before recommending tuning changes.
- Report correctness and progression together. Do not recommend a candidate from mean skill delta alone.
- When using review mode, always include the verdict, rationale, caveat, and the evidence class used (compare or matrix).
- Treat compare-only evidence for broad or foundational tuning changes as non-approving, even when the candidate looks favorable on aggregate deltas.
- When review output includes policy fields, report whether the evidence level is sufficient and whether the result is advisory-only.
- When phase-aware output is present, report any regressing phases and do not collapse them into an aggregate-only summary. Distinguish phase summaries from phase deltas explicitly when the review output provides both.
- Treat PASS as advisory, not approval. Foundational tuning changes still require matrix evidence and targeted e2e validation.
- Save outputs via `--out` and cite artifact paths in summaries when commands are run.
- Treat tuning schema validation failures as blocking for compare conclusions until input files are corrected.
- Keep comparison claims deterministic: fixed seeds, fixed scenario settings, and explicit baseline/candidate provenance.
- Follow this review structure when summarizing a tuning candidate: verdict, rationale, caveat, evidence class, policy sufficiency, any regressing phase, and any operator-specific warning. Do not describe phase delta as if it were learner-stage coverage.
