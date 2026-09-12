# Helper Discovery And Placement

This guide helps you decide where helper logic belongs and how to find existing helpers before adding new ones.

## Goals

- Keep route and component files focused on orchestration and rendering.
- Keep framework-neutral training rules in small, testable domain modules.
- Keep application orchestration and side-effect wrappers in helper modules.
- Reuse existing helpers instead of creating parallel implementations.

## Discovery Checklist Before Adding A Helper

1. Search existing domain modules and helpers first:
   - `rg "<keyword>" src/lib/domain src/lib/helpers tests/unit`
2. Check route-local usage patterns:
   - inspect nearby route files in `src/routes/**`
3. Check if behavior already exists in a layout helper:
   - review `src/lib/helpers/layout*.ts`
4. Confirm no equivalent rule exists in the framework-neutral domain:
   - review `src/lib/domain/skill-progression`, `src/lib/domain/puzzle-generation`, and `src/lib/domain/quiz`

If an existing helper is close but not perfect, prefer extending it in a small, backwards-compatible way.

## Placement Rules

### Place in `src/lib/domain/` when:

- logic expresses arithmetic, skill progression, puzzle generation, or quiz rules
- logic is deterministic and independent of Svelte, SvelteKit, Paraglide, and browser globals
- logic benefits from direct unit tests without rendering UI

### Place in `src/lib/helpers/` when:

- logic coordinates application behavior or wraps side effects
- logic is reused across routes/components
- browser or framework behavior is injected through a narrow dependency

### Keep in route/component when:

- logic is a one-off local UI concern
- state is temporary and tightly coupled to local markup lifecycle
- extraction would create indirection without reuse value

### Move to context contract when:

- parent routes/layouts expose actions to nested descendants
- behavior is capability-style (register, invoke, notify)

Use `src/lib/contexts/**` for contract shape and context keys, while implementation details can stay in route/layout helpers.

## Naming And File Conventions

- Use responsibility names in the domain, such as `skillUpdate.ts`, `puzzleDifficulty.ts`, and `operatorSelection.ts`.
- Prefer descriptive names ending with `Helper.ts` for application helpers.
- Keep names aligned to feature scope:
  - `layout*Helper.ts` for app shell/layout orchestration helpers
  - `quiz*Helper.ts` for quiz domain behavior
  - `*Route*Helper.ts` for route load/navigation concerns
- Export focused functions instead of large stateful classes.
- Keep helper APIs explicit and narrow; avoid optional parameter sprawl.

## Testing Expectations

For non-trivial helper changes:

1. Add or update unit tests in `tests/unit/*helper*.test.ts`.
2. If behavior affects navigation/focus/results flow, add route-level regression tests.
3. If user flow changes, add targeted Playwright specs for affected paths.

This keeps helper contracts stable and prevents regressions when orchestration is refactored.

## Practical Examples In This Repo

- Layout navigation orchestration:
  - `src/lib/helpers/layoutTransitionHelper.ts`
- Skill progression:
  - `src/lib/domain/skill-progression/skillUpdate.ts`
- Puzzle generation:
  - `src/lib/domain/puzzle-generation/puzzleGenerator.ts`
- beforeNavigate payload mapping:
  - `src/lib/helpers/layoutBeforeNavigateHelper.ts`
- Locale switching and labels:
  - `src/lib/helpers/localeHelper.ts`
- URL/query parsing and serialization:
  - `src/lib/helpers/urlParamsHelper.ts`

Use these as reference style when introducing new helper modules.
