---
description: 'Use when changing deterministic tuning analysis, related docs, or tests.'
name: 'Regneflyt Offline Analysis'
applyTo: 'scripts/analyze-tuning.mjs,src/lib/helpers/analysis/**/*.ts,src/lib/domain/skill-progression/adaptiveTuning.ts,src/lib/domain/skill-progression/adaptiveTuningValidation.ts,tests/unit/tuningAnalysis*.test.ts,docs/TUNING_MEASUREMENT_GUIDE.md,README.md,package.json'
---

# Regneflyt Offline Analysis Rules

- Run `npm run analyze:tuning -- --baseline <path> --candidate <path>` for tuning-impact changes.
- Keep baseline and candidate inputs explicit; do not infer missing tuning files.
- Treat the standard 100-step zero-start run as an early-progression sample, not balanced evidence across every skill level.
- For broad changes, compare explicit cohorts at starting skills 0, 40, 60, and 80 with short runs (normally `--steps 100`).
- Inspect dedicated-operator progression separately from all-operator interaction.
- Inspect phase, correct-gain, incorrect-penalty, difficulty, blocked-gain, composition, and seed-sensitivity metrics together.
- Treat accuracy and response time as fixed mechanical inputs, not predicted learner outcomes.
- Use 10–20-step runs for local gain and penalty sensitivity: `--accuracy 1 --response-seconds 3` for gains and `--accuracy 0.4 --response-seconds 3` for penalties. Use `--accuracy 0.7 --response-seconds 6` for timing checks, paired with the relevant starting-skill cohort.
- Review operator mixing with `--operators all --starting-skills 20,50,50,50 --steps 300` or another explicitly uneven skill tuple.
- Use `--steps 600` only for explicit long-progression stress checks.
- Treat the three default seeds as a small deterministic sensitivity check, not statistical evidence; operator modes for one seed intentionally reuse the same answer sequence.
- Cite the generated JSON artifact path when reporting analysis results.
- Treat tuning-schema validation failures as blocking until the input files are corrected.
- Keep analysis deterministic and avoid adding automatic verdicts, evidence policy, presets, or learner-model assumptions.
