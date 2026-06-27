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
- When using review mode, always include `review.status`, evidence class/scope/sufficiency, top watch/regression findings, caveat, and artifact path.
- Treat compare-only evidence for broad or foundational tuning changes as non-approving, even when the candidate looks favorable on aggregate deltas.
- When review output includes policy fields, report whether the evidence level is sufficient and whether the result is advisory-only.
- When phase-aware output is present, report any regressing phases and do not collapse them into an aggregate-only summary. Distinguish phase summaries from phase deltas explicitly when the review output provides both.
- **Review Model**: Use `review.status` (`ok` | `watch` | `regression`) and `review.findings` as the review contract. Treat `ok` as advisory, not approval.
- **Phase Acceleration Findings**: `phase_acceleration` findings are observations that a phase compressed with improved efficiency. They are not approval. Report them as observations and still validate puzzle difficulty, regression tests, and foundational practice coverage.
- **Operator Findings**: Use `operator_imbalance` findings and `summary.perOperator` to assess operator-specific drift.
- **Schema Contract**: Review artifact payloads are versioned with `jsonSchemaVersion`; current contract is `3.0.0`. Machine consumers should key off `review.status`, `review.evidence`, and `review.findings`.
- **Structured Output**: Compare and matrix review text should use the same section order (`METRICS`, `LEARNING IMPACT REVIEW`, `METADATA`) so evidence mode does not change report reading flow.
- Treat `review.status=ok` as advisory, not approval. Foundational tuning changes still require matrix evidence and targeted e2e validation.
- Save outputs via `--out` and cite artifact paths in summaries when commands are run.
- Put ad-hoc local analysis scripts and generated artifacts under analysis-artifacts/ to avoid polluting repository root.
- Treat tuning schema validation failures as blocking for compare conclusions until input files are corrected.
- Keep comparison claims deterministic: fixed seeds, fixed scenario settings, and explicit baseline/candidate provenance.
- Follow this review structure when summarizing a tuning candidate: `review.status`, evidence class/scope/sufficiency, top `watch` or `regression` findings by kind and phase/operator/metric/value, phase acceleration observations if present, artifact paths, and validation caveat. Do not describe phase delta as if it were learner-stage coverage.
