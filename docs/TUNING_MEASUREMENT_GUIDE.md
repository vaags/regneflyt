# Tuning Measurement Guide

Use `npm run analyze:tuning` to inspect deterministic adaptive-model behavior.
The command runs the real puzzle generator and skill updates with fixed seeds,
answer outcomes, and response time.

It measures model mechanics. It does not predict learner accuracy, speed,
understanding, or pedagogical effectiveness.

## Standard workflows

Inspect the repository tuning:

```bash
npm run analyze:tuning
```

Inspect one tuning file:

```bash
npm run analyze:tuning -- --tuning ./analysis/candidate.json
```

Compare two tuning files under identical inputs:

```bash
npm run analyze:tuning -- \
  --baseline ./analysis/baseline.json \
  --candidate ./analysis/candidate.json
```

The standard run uses seeds `1,42,99`, all four individual operators plus
all-operator mode, 100 steps, 70% deterministic answer accuracy, and a fixed
three-second response time. It prints a compact report and saves one JSON
artifact under `analysis-artifacts/`.

The zero-start standard run is a routine early-progression sample. It is not
balanced evidence for every skill level. Use explicit cohorts for broad changes,
or opt into `--steps 600` for a long progression stress run.

Run `npm run analyze:tuning -- --help` for all options.

## Skill cohorts

For broad tuning changes, run the same comparison at explicit skill cohorts.
The 100-step runs below review progression and composition around each cohort:

```bash
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --starting-skills 0 --steps 100
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --starting-skills 40 --steps 100
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --starting-skills 60 --steps 100
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --starting-skills 80 --steps 100
```

- `0`: entry and calibration behavior
- `40`: calibration boundary and normal progression
- `60`: taper boundary
- `80`: high-skill and endgame behavior

## Targeted mechanics

Change one input dimension at a time when investigating a tuning group:

```bash
# Local gain and calibration sensitivity
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --accuracy 1 --response-seconds 3 --starting-skills 40 --steps 10

# Penalty and recovery behavior
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --accuracy 0.4 --response-seconds 3 --starting-skills 60 --steps 20

# Timing sensitivity
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --accuracy 0.7 --response-seconds 6 --starting-skills 60 --steps 100

# Operator mixing and catch-up behavior
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --operators all --starting-skills 20,50,50,50 --steps 300
```

Pass one starting skill to initialize every operator equally, or four values to
model an uneven profile. Use `--seeds`, `--operators`, and `--steps` only when a
targeted investigation needs narrower or broader coverage.

Use 10–20 steps for local gain or penalty sensitivity when a longer run could
reach a fixed skill bound and hide the direct effect. Use 100 steps for
routine cohort progression and composition, 300 steps for uneven all-operator
interaction, and 600 steps only for long-progression stress.

Use a long stress run only for questions such as eventual endgame reachability,
long-run stalls, repeated phase oscillation, or prolonged operator imbalance:

```bash
npm run analyze:tuning -- --baseline base.json --candidate candidate.json \
  --steps 600
```

## Reading the report

The report separates two experiment families:

- **Dedicated operator progression:** each operator trained in isolation.
- **All-operator interaction:** weighted selection, catch-up behavior, and skills
  progressing together.

Do not combine their final-skill values into one interpretation. Review these
dimensions together within the relevant experiment:

- **Final skill and net skill change:** modeled progression pace.
- **Mean correct gain:** realized skill gain per correct answer, including zero
  gains from the difficulty gate.
- **Mean incorrect penalty:** realized skill loss per incorrect answer.
- **Puzzle difficulty and difficulty ratio:** how generated challenge tracks the
  active skill value.
- **Blocked gain rate:** correct answers that produce no gain because a puzzle is
  too easy relative to skill.
- **Ceiling-clamped gain rate:** correct answers whose calculated gain could not
  be fully realized because skill reached the fixed maximum of 100.
- **Floor-clamped penalty rate:** incorrect answers whose post-protection penalty
  could not be fully realized because skill reached the fixed minimum of 0.
- **Cooldown puzzles and cooldown difficulty:** how often post-error recovery is
  active and how challenging those generated puzzles are.
- **Phase metrics:** behavior below calibration, between calibration and taper,
  and above taper. Comparisons use baseline phase thresholds for both tunings.
- **Operator metrics:** puzzle share and progression for addition, subtraction,
  multiplication, and division.
- **Quiz composition:** normal/alternate/random modes, unknown operands, negative
  subtraction, unknown divisors, and carry/borrow frequency.
- **Seed range:** a small deterministic sensitivity check for obvious seed
  dependence.

Operator modes for the same seed intentionally reuse the same answer sequence so
baseline/candidate and cross-operator mechanics are paired. The three default
seeds are not independent learner samples and do not establish statistical
stability.

The command deliberately emits no `ok`, `watch`, or `regression` verdict. A
favorable aggregate can hide an operator or phase tradeoff, and model output is
not learner evidence.

### Tuning-group guidance

| Tuning area                    | Primary evidence                                                         |
| ------------------------------ | ------------------------------------------------------------------------ |
| Gains and calibration          | Correct-gain metrics across skills 0, 40, 60, and 80                     |
| Penalties and cooldown         | Incorrect penalties plus post-error difficulty in dedicated add/sub runs |
| Timing and confidence          | Correct gains and incorrect penalties at multiple response times         |
| Operator mixing                | All-operator selection shares with uneven starting skills                |
| Add/sub range and carry        | Dedicated difficulty plus carry/borrow composition                       |
| Multiplication/division ranges | Dedicated difficulty and blocked-gain rates                              |
| Puzzle-mode rollout            | Normal/alternate/random composition near rollout skills                  |
| Algebraic rollout              | Unknown-operand, negative-subtraction, and unknown-divisor composition   |

## Required supporting validation

Tuning changes should also run the relevant deterministic tests:

```bash
npm run test:unit -- tests/unit/skillUpdate.regression.matrix.test.ts --reporter=dot
npm run test:unit -- tests/unit/skillUpdate.regression.thresholds.test.ts --reporter=dot
npm run test:unit -- tests/unit/puzzleGenerator.test.ts --reporter=dot
```

Run `tests/e2e/adaptive-progression.spec.ts` for changes that affect integrated
progression behavior. Tuning analysis supplements these tests; it does not
replace them.

## Artifacts

Comparison terminal output shows baseline, candidate, and delta values for the
primary mechanics. Phase and composition sections remain delta-focused. The JSON
artifact retains complete baseline and candidate summaries. It has
`schemaVersion: 2` and records the full run configuration, embedded resolved
tuning snapshots, field-level tuning changes, per-seed/operator summaries,
dedicated and all-operator aggregates, phase mechanics, and composition evidence
counts. Aggregate count fields are totals; mean and rate fields are named
explicitly. A composition rate is `null` when no eligible puzzles were generated.
Use `--out <path>` for a stable destination. Artifacts are internal analysis
output and do not promise backward compatibility across schema versions.
