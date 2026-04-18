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

- [Store and context decision guide](STORE_AND_CONTEXT_PATTERNS.md)
- [Helper discovery and placement guide](HELPER_DISCOVERY_AND_PLACEMENT.md)
- [Contribution checklists and templates](CONTRIBUTION_CHECKLISTS.md)
- [Contributing guide](CONTRIBUTING.md)
