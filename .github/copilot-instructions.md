# Regneflyt Copilot Instructions

Regneflyt is a SvelteKit + TypeScript math training game. Keep changes minimal, focused, and easy to review. Prefer existing patterns over new abstractions.
This file defines repository-wide coding standards and validation expectations.

## Architecture

- Routes and page behavior live under `src/routes`.
- Reusable UI belongs in `src/lib/components`.
- Framework-neutral training rules belong in `src/lib/domain`, grouped by arithmetic, skill progression, puzzle generation, and quiz responsibility.
- Application orchestration and side-effect wrappers belong in `src/lib/helpers` and should stay testable and deterministic.
- External-library presentation bindings belong in `src/lib/integrations`.
- Shared state should reuse `src/lib/stores.ts` unless a new store is clearly justified.
- Domain code must import only canonical modules under `src/lib/domain` and approved side-effect-free libraries.

## Repo Rules

- Preserve semantic HTML, keyboard accessibility, and WCAG 2.2 AAA requirements.
- Do not weaken TypeScript strictness or introduce `any` unless unavoidable.
- Check nearby code first and prefer reusing existing helpers, stores, components, and test utilities before adding new abstractions or parallel logic.
- Avoid introducing parallel stores, helpers, or derived state when an existing abstraction already fits.
- When working with domain models that have associated metadata (labels, configuration, mappings), check if an exhaustive registry already exists for that model. Add new values to the existing registry rather than creating separate data structures. Refer to the TypeScript strictness rules for the exhaustive registry pattern.
- Do not hardcode new user-facing strings when translations are expected.
- Treat `src/lib/paraglide` as generated output and regenerate it with scripts instead of manual edits.
- Never perform Git write operations unless the user explicitly asks for them.
- Do not stage files, create commits, rewrite history, switch branches, or discard changes on the user's behalf.
- Do not upgrade dependencies or change CI, deployment, or build configuration unless explicitly requested.
- Keep public behavior and file structure stable unless the task requires otherwise.
- Avoid unrelated refactors in the same change.

## Changelog And Versioning

- Treat every commit made directly on `main` as a production release. Before
  committing on `main`, apply the appropriate semantic-version bump and move the
  release changes into a version heading dated with the current local date.
- Use `Unreleased` only for changes on branches that have not reached `main`.
- Update `CHANGELOG.md` for every notable change. Record user-visible features,
  fixes, accessibility changes, removals, significant architecture or platform
  changes, and maintainer-facing workflow changes in the applicable unreleased
  or versioned section.
- Do not add entries for routine implementation details, formatting, tests-only
  maintenance, minor documentation edits, or internal refactors without
  release-level impact.
- One changelog entry may summarize multiple related commits. Keep entries
  curated around outcomes rather than copying commit subjects.
- Use semantic versioning for each production release: patch for compatible
  fixes or maintenance, minor for compatible functionality, and major for
  incompatible changes.
- On non-`main` branches, do not bump the version for every development commit;
  accumulate changes under `Unreleased` until preparing the merge to `main`.
- Keep the version in `package.json`, the top-level `package-lock.json` version,
  and `package-lock.json`'s root package version identical.
- A version bump must include a staged, dated `CHANGELOG.md` section for the new
  version.
- Use the current local date for a versioned changelog heading.

## Validation

- After non-trivial edits, run `npm run verify` as the standard loop. It runs codegen once, then CSP hash validation, `svelte-check`, Prettier, ESLint, and unit tests.
- To scope unit tests to specific files, run `npm run test:unit -- <files>` (for example `npm run test:unit -- tests/unit/seed.test.ts --reporter=dot`).
- Use the routing table below to decide which additional validation a change requires.

| Change touches | Run |
|---|---|
| Any TypeScript or Svelte source | `npm run verify` |
| Navigation, focus, keyboard, accessibility, or results flow | `npm run verify`, plus targeted Playwright specs with `--reporter=line` |
| Dialogs, live regions, focus rings, touch targets, or validation feedback | `npm run verify`, plus `npm run test:e2e:a11y` |
| Offline or service worker behavior | `npm run verify`, plus `tests/e2e/offline-fallback.spec.ts`, `tests/e2e/update-lifecycle.spec.ts`, and `tests/e2e/update-notification.spec.ts` |

## Review

- Treat post-change code review as a mandatory quality gate before finalizing any non-trivial work.
- Review changed code for correctness, regressions, naming, duplication, accessibility, i18n impact, type safety, and consistency with nearby patterns.
- If the review finds issues that are feasible to fix within scope, fix them before finalizing.
- For trivial docs-only or wording-only edits, use a shortened review pass.

## Scoped Instructions

- Use `AGENTS.md` as the source of truth for instruction routing, precedence, tie-breakers, and applicability.
- If `AGENTS.md` is unavailable in a specific tool context (for example, the tool does not load repository-root instruction files), follow matching `.github/instructions/*.instructions.md` files directly.
- Before editing files covered by a scoped instruction, read the matching `.github/instructions/*.instructions.md` file and follow it.
- Keep file-specific rules in scoped instruction files instead of expanding this workspace file.

## Response

- Report files changed, commands run, test results, and known risks or untested paths.
- State whether validation was run or skipped, and why if it was skipped.
- Summarize whether the review found issues, what was fixed, and any remaining risks or untested paths.
- If a recommended command cannot run, state the blocker and use the closest meaningful validation.
