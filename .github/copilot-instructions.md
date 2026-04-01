# Regneflyt Copilot Instructions

Regneflyt is a SvelteKit + TypeScript math training game. Keep changes minimal, focused, and easy to review. Prefer existing patterns over new abstractions.

## Architecture

- Routes and page behavior live under `src/routes`.
- Reusable UI belongs in `src/lib/components`.
- Business logic belongs in `src/lib/helpers` and should stay testable and deterministic.
- Shared state should reuse `src/lib/stores.ts` unless a new store is clearly justified.
- Domain models and constants belong in `src/lib/models` and `src/lib/constants`.

## Repo Rules

- Preserve semantic HTML, keyboard accessibility, and WCAG 2.2 AAA requirements.
- Do not weaken TypeScript strictness or introduce `any` unless unavoidable.
- Check nearby code first and prefer reusing existing helpers, stores, components, and test utilities before adding new abstractions or parallel logic.
- Avoid introducing parallel stores, helpers, or derived state when an existing abstraction already fits.
- Do not hardcode new user-facing strings when translations are expected.
- Treat `src/lib/paraglide` as generated output and regenerate it with scripts instead of manual edits.
- Never perform Git write operations unless the user explicitly asks for them.
- Do not stage files, create commits, rewrite history, switch branches, or discard changes on the user's behalf.
- Do not upgrade dependencies or change CI, deployment, or build configuration unless explicitly requested.
- Keep public behavior and file structure stable unless the task requires otherwise.
- Avoid unrelated refactors in the same change.

## Validation

- After non-trivial edits, run `npm run check`, `npm run lint`, and `npm run test:unit -- --reporter=dot`.
- If navigation, focus, keyboard, accessibility, or results flow changes, run targeted Playwright specs with `--reporter=line`.
- If offline or service worker behavior changes, also run `tests/e2e/offline-fallback.spec.ts`, `tests/e2e/update-lifecycle.spec.ts`, and `tests/e2e/update-notification.spec.ts`.

## Review

- Treat post-change code review as a mandatory quality gate before finalizing any non-trivial work.
- Review changed code for correctness, regressions, naming, duplication, accessibility, i18n impact, type safety, and consistency with nearby patterns.
- If the review finds issues that are feasible to fix within scope, fix them before finalizing.
- For trivial docs-only or wording-only edits, use a shortened review pass.

## Scoped Instructions

- Before editing files covered by a scoped instruction, read that instruction and follow it.
- Follow `.github/instructions/svelte-tailwind.instructions.md` when editing Svelte components or route markup.
- Follow `.github/instructions/i18n.instructions.md` when editing translated UI copy, locale files, or Paraglide assets.
- Follow `.github/instructions/e2e-accessibility.instructions.md` when editing Playwright specs, focus or keyboard flows, or accessibility helpers.
- Follow `.github/instructions/offline-service-worker.instructions.md` when changing service worker, offline fallback, update lifecycle, or cache behavior.
- Keep file-specific rules in scoped instruction files instead of expanding this workspace file.

## Response

- Report files changed, commands run, test results, and known risks or untested paths.
- State whether validation was run or skipped, and why if it was skipped.
- Summarize whether the review found issues, what was fixed, and any remaining risks or untested paths.
- If a recommended command cannot run, state the blocker and use the closest meaningful validation.
