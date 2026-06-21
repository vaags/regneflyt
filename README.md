# Regneflyt

Regneflyt is a SvelteKit + TypeScript math training game for the four basic operations
(addition, subtraction, multiplication, division).

## Quick Start

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Run core quality gates:
   - `npm run check`
   - `npm run lint`
   - `npm run test:unit -- --reporter=dot`

## Offline Analysis

Use the offline analysis workflow to compare tuning changes in a deterministic way.

Start with `npm run analyze:review` for most tuning changes. Use the lower-level compare or matrix commands only when you need direct control over the evidence mode.

1. Run the review command:

- `npm run analyze:review -- --preset early-game --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json`
- `npm run analyze:review -- --preset foundational --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json`
- `npm run analyze:review -- --preset penalty --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json`
- `npm run analyze:review -- --scope broad --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --title my-experiment`

2. Run the default analysis only when you want a single-snapshot baseline check:

- `npm run analyze:offline`

3. Run compare mode directly when you want manual single-scenario control:

- `npm run analyze:compare -- --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --title my-experiment --seed 123`

4. Run matrix mode directly when you want manual multi-seed, multi-operator control:

- `npm run analyze:matrix -- --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --title my-experiment --seeds 1,42,99 --operators addition,subtraction,multiplication,division,all`

5. Write reports to files:

- `npm run analyze:offline -- --out ./analysis/latest.md`
- `npm run analyze:review -- --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --out ./analysis/review.txt`
- `npm run analyze:matrix -- --baseline-tuning ./analysis/baseline.json --candidate-tuning ./analysis/candidate.json --out ./analysis/matrix.txt`

Commands print summaries to stdout. Review and matrix modes also write a JSON companion report at `<out>.json` when `--out` is provided.

Use `--scope narrow|broad|foundational` when the change scope matters. Broad or foundational changes should use matrix evidence before approval.

Common review presets are listed above because they are the recommended starting point for day-to-day tuning work.

Review output now includes phase-aware evidence using the existing adaptive progression boundaries: early, mid, and late. Compare reviews show baseline phase summaries, candidate phase summaries, and explicit phase deltas separately. Matrix reviews show aggregated phase deltas. These signals are additive evidence intended to catch tradeoffs that aggregate deltas can hide.

## Architecture At A Glance

- `src/routes`: route-level screens and page wiring.
  - `src/routes/+layout.svelte`: app-level orchestration (navigation, context wiring, global UI shell).
  - `src/routes/+page.svelte`: menu entry route.
  - `src/routes/quiz`, `src/routes/results`, `src/routes/settings`: feature routes.
- `src/lib/components`: reusable UI components.
  - `layout`: shell/navigation primitives.
  - `panels`, `dialogs`, `widgets`: feature-level reusable UI.
- `src/lib/helpers`: deterministic business and orchestration helpers.
  - `layout/`: app-level orchestration (transitions, mounting, context setup).
  - `quiz/`: quiz-domain logic (state, results, navigation, menu).
  - Root level: shared utilities (adaptive difficulty, puzzle generation, URL params).
- `src/lib/stores.ts` and `src/lib/stores.svelte.ts`: shared app state entrypoints.
- `src/lib/contexts`: cross-route context contracts.
- `src/lib/models`: domain models and schemas.
- `tests/unit`: fast behavior/unit regressions.
- `tests/e2e`: end-to-end user-flow and accessibility regressions.

## Where To Edit What

- Add or adjust route behavior:
  - edit the corresponding route under `src/routes/**`.
- Add reusable UI:
  - prefer `src/lib/components/**`.
- Add deterministic logic or side-effect wrappers:
  - prefer `src/lib/helpers/**`.
- Add shared state:
  - prefer existing stores in `src/lib/stores.svelte.ts`.
- Add cross-route interaction contracts:
  - use `src/lib/contexts/**`.
- Add domain-level validation or constants:
  - use `src/lib/models/**` and `src/lib/constants/**`.

## Validation Workflow

Use this order for local confidence:

1. Type and framework checks:
   - `npm run check`
2. Formatting and lint:
   - `npm run lint`
3. Unit tests:
   - `npm run test:unit -- --reporter=dot`
4. Targeted e2e (changed area):
   - `npx playwright test --reporter=line tests/e2e/<spec>.ts`
5. Full e2e confidence (optional before merge):
   - `npx playwright test --reporter=line`

## Generated Files And Gotchas

- `src/lib/paraglide/**` is generated output.
  - Do not edit generated Paraglide files manually.
  - Regenerate through project scripts (for example via `npm run prepare:codegen`, which is already part of `check`, `lint`, and test scripts).
- Keep import style consistent for shared stores:
  - use `'$lib/stores'` as canonical app import entrypoint.

## Developer Notes

- Accessibility and keyboard navigation are hard requirements.
- Keep changes minimal, focused, and behavior-preserving unless a behavior change is explicitly requested.
- Prefer adding regression coverage with each non-trivial change.

## Further Reading

### Domain Knowledge

- [Adaptive Algorithm Guide](docs/ADAPTIVE_ALGORITHM.md) — How student skills evolve, how puzzle difficulty is calculated, and why each parameter is tuned as it is.
- [Architecture Decision Records](docs/adr/) — Design rationale for key decisions (multiplicative skill scaling, operator-specific difficulty scoring, progression curves, tech stack).
- [Tuning Measurement Guide](docs/TUNING_MEASUREMENT_GUIDE.md) — How to safely measure and validate changes to tuning parameters without breaking learning curves.

### Development

- [Store and context decision guide](docs/development/STORE_AND_CONTEXT_PATTERNS.md)
- [Helper discovery and placement guide](docs/development/HELPER_DISCOVERY_AND_PLACEMENT.md)
- [Contribution checklists and templates](docs/development/CONTRIBUTION_CHECKLISTS.md)
- [Contributing guide](CONTRIBUTING.md)
