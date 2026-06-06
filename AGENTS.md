# Regneflyt Agent Instructions

## Purpose

This file is the entrypoint for AI coding agents working in this repository.
It routes agents to the authoritative instruction files and defines precedence,
conflict handling, and maintenance rules.
It does not define repository coding standards; those live in `.github/copilot-instructions.md` and scoped instruction files.

## Precedence

Apply instructions in this order:

1. This file for routing, scope boundaries, and conflict policy.
2. `.github/copilot-instructions.md` for repository-wide policy.
3. Matching files under `.github/instructions/*.instructions.md` for scoped policy, which overrides generic repository-wide guidance for matching paths.

### Tie-breakers

- If multiple scoped instructions apply, the most specific `applyTo` pattern wins (single-file path > narrow directory glob > broad wildcard glob).
- If specificity is equal and directives conflict, stop and ask the user.
- If supplementary docs conflict with instruction files, follow instruction files and ask the user if ambiguity remains.

## Applicability Matrix

Use this matrix to determine which scoped instructions apply to a task.

| File pattern | Instruction file |
|---|---|
| `src/routes/**/*.svelte`, `src/lib/components/**/*.svelte` | `.github/instructions/svelte-tailwind.instructions.md` |
| `messages/*.json`, `src/lib/paraglide/**`, `src/routes/**/*.svelte`, `src/lib/components/**/*.svelte` | `.github/instructions/i18n.instructions.md` |
| `tests/e2e/**/*.ts`, `tests/helpers/a11yInvariants.ts` | `.github/instructions/e2e-accessibility.instructions.md` |
| `src/service-worker.ts`, `src/hooks.client.ts`, `static/offline.html`, `tests/e2e/offline-fallback.spec.ts`, `tests/e2e/update-lifecycle.spec.ts`, `tests/e2e/update-notification.spec.ts`, `tests/unit/serviceWorker.test.ts` | `.github/instructions/offline-service-worker.instructions.md` |
| `src/**/*.ts`, `tests/**/*.ts` | `.github/instructions/typescript-strictness.instructions.md` |
| `src/lib/helpers/**/*.ts` | `.github/instructions/helpers.instructions.md` |
| `tests/unit/**/*.ts`, `tests/unit/**/*.svelte.ts` | `.github/instructions/unit-tests.instructions.md` |

## Authoritative Files

- `.github/copilot-instructions.md`
- `.github/instructions/svelte-tailwind.instructions.md`
- `.github/instructions/i18n.instructions.md`
- `.github/instructions/e2e-accessibility.instructions.md`
- `.github/instructions/offline-service-worker.instructions.md`
- `.github/instructions/typescript-strictness.instructions.md`
- `.github/instructions/helpers.instructions.md`
- `.github/instructions/unit-tests.instructions.md`

## Maintenance Metadata

- Owner: Regneflyt maintainers
- Last reviewed: 2026-06-06
- Review cadence: quarterly or after instruction architecture changes
- Update triggers:
  - New recurring review feedback in an unscoped area
  - New domain-specific constraints that need file-scoped enforcement
  - Changes to repository policy in `.github/copilot-instructions.md`

## Drift Controls

- Add or change detailed policy in scoped instruction files first.
- Keep this file concise and route-focused.
- Keep policy wording imperative, testable, and non-ambiguous.

## Instruction Quality Rubric

Each instruction file should pass these checks:

- Uses concise imperative statements.
- Uses enforceable wording and avoids vague terms.
- Defines scope clearly with `applyTo` patterns.
- Avoids duplicating policy already defined in another instruction file.
- Avoids contradicting repository-wide policy.
- Keeps examples minimal and focused on clarifying edge cases.

## Non-goals

- Duplicating full domain rules from scoped instruction files
- Maintaining historical change logs in this file
- Adding long examples or feature-level implementation details
