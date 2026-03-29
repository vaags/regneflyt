# Regneflyt Copilot Instructions

## Project context

- Regneflyt is a SvelteKit + TypeScript math training game.
- Keep changes minimal, focused, and easy to review.
- Prefer existing patterns over introducing new abstractions.

## Instruction hierarchy

- Use this file as the default baseline for all work.
- If a scoped instruction file applies to the files being changed, follow the scoped file in addition to this file.
- If guidance conflicts, prefer the more specific scoped instruction:
  - `.github/instructions/i18n.instructions.md`
  - `.github/instructions/offline-service-worker.instructions.md`
  - `.github/instructions/e2e-accessibility.instructions.md`

## Architecture expectations

- Routes and page behavior live under `src/routes`.
- Reusable UI belongs in `src/lib/components`.
- Business logic belongs in `src/lib/helpers` and should stay testable and deterministic.
- Shared state should use existing stores in `src/lib/stores.ts` unless a new store is clearly justified.
- Domain models and constants belong in `src/lib/models` and `src/lib/constants`.

## Internationalization rules

- Do not hardcode new user-facing strings in components when translations are expected.
- Translation source files are in `messages/*.json`.
- Generated paraglide output in `src/lib/paraglide` should be produced via scripts, not manually edited.
- If message keys change, run `npm run prepare:codegen` and adjust impacted tests.

## Quality and accessibility

- Preserve semantic HTML and keyboard accessibility in all UI changes.
- WCAG 2.2 AAA compliance is a hard requirement for all user-facing implementations.
- Do not weaken TypeScript strictness or bypass type checks with `any` unless absolutely necessary.
- Prefer small, pure helper functions for calculation and quiz logic.
- Add or update tests for behavior changes (unit first, then e2e when flow changes).

## Post-implementation review

- Treat post-implementation review as a mandatory quality gate for every feature or behavior change; do not finalize before this review is complete.
- For trivial non-behavioral edits (for example docs or wording-only changes), use a shortened review pass.
- Review against current best practices for SvelteKit, Svelte, TypeScript, Vitest, and Playwright used in this repo.
- Review the new/changed code in direct relation to existing code in the same area: verify consistency with established patterns, naming, architecture boundaries, and opportunities to reuse existing helpers/components instead of adding parallel logic.
- Perform an explicit refactoring opportunity scan: identify nearby duplication, over-complex logic, and cohesion issues introduced or revealed by the change; apply safe, scoped refactors in the same change when feasible.
- Check readability and maintainability: clear naming, focused functions/components, low complexity, and minimal duplication.
- Perform a naming-fit review: confirm variable, function, component, type, and file names still match their current responsibilities after the change; rename outdated or misleading names when feasible.
- Check overall code quality: type safety, error handling, accessibility, i18n impact, and consistency with existing project patterns.
- If review findings are discovered, fix them in the same change when feasible and summarize what was improved.

## Validation workflow

- After non-trivial edits, run:
  - `npm run check`
  - `npm run lint`
  - `npm run test:unit -- --reporter=dot`
- If navigation, focus, keyboard, accessibility, or results flow is touched, run targeted Playwright specs.
- If service worker or offline behavior is touched, include offline/update lifecycle e2e coverage.

## Test selection matrix

- Helper/model/store logic changes:
  - `npm run check`
  - `npm run lint`
  - `npm run test:unit -- --reporter=dot`
- Route/component UI flow changes:
  - `npm run check`
  - `npm run lint`
  - `npm run test:unit -- --reporter=dot`
  - targeted Playwright specs for affected flow(s)
- Service worker/offline/update lifecycle changes:
  - `npm run check`
  - `npm run lint`
  - `npm run test:unit -- --reporter=dot`
  - `npx playwright test tests/e2e/offline-fallback.spec.ts tests/e2e/update-lifecycle.spec.ts tests/e2e/update-notification.spec.ts --reporter=line`

## Command output preference

- Prefer concise terminal output when possible.
- For ad-hoc runs, prefer compact reporters such as:
  - `npm run test:unit -- --reporter=dot`
  - `npm run test:e2e -- --reporter=line`

## Editing guardrails

- Keep public behavior and file structure stable unless the task requires otherwise.
- Avoid broad refactors in the same change as bug fixes.
- Preserve existing naming, formatting, and folder conventions.

## Require approval first

- Do not upgrade dependencies unless explicitly requested.
- Do not change CI, deployment, or build configuration unless explicitly requested.
- Do not regenerate large snapshots/golden outputs unless required by the task.
- Do not include unrelated refactors in the same change.

## Response contract

- After changes, report:
  - files changed
  - commands run
  - test results
  - known risks or untested paths

## Fallback behavior

- If a recommended command cannot run due to environment/tooling constraints:
  - state the blocker clearly
  - run the closest meaningful alternative
  - continue with targeted validation where possible
