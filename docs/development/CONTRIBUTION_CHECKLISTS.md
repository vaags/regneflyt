# Contribution Checklists And Templates

Use this file as a practical checklist when adding or modifying helpers, components, and tests.

## PR Quality Checklist

Mark each item before opening or merging a PR:

- [ ] Scope is small, focused, and behavior-preserving unless behavior change is intentional.
- [ ] Accessibility is preserved or improved (semantic HTML, keyboard flow, focus behavior, ARIA usage where needed).
- [ ] Internationalization is respected (no hardcoded user-facing strings when translations are expected).
- [ ] Existing abstractions were reused when appropriate (helpers, stores, contexts, test utilities).
- [ ] New logic includes regression coverage at the right level (unit and/or e2e).
- [ ] Tuning changes include `npm run analyze:tuning` comparison output and the
      relevant targeted domain or e2e validation.
- [ ] Tuning decisions consider overall, phase, operator, challenge, and seed
      variation metrics without treating fixed simulation inputs as learner evidence.
- [ ] Broad tuning changes include explicit skill-cohort checks; operator-mixing
      changes use an uneven all-operator skill profile.
- [ ] `CHANGELOG.md` describes every notable release-level outcome without
      duplicating routine commit history.
- [ ] If committing directly on `main` or preparing a merge to `main`, the
      release has a dated changelog section, the SemVer bump matches the change,
      and the versions in `package.json` and `package-lock.json` are synchronized.
- [ ] Validation commands were run for the changed scope.

Note: type safety (no unnecessary `any`) and stable `data-testid` interaction selectors are already
enforced by `npm run verify` (`@typescript-eslint/no-explicit-any` and the `no-restricted-syntax`
selector rules in `eslint.config.js`) — no separate manual check needed for those.

## Minimal Helper Template

Use this template for new deterministic helper logic.

```ts
// src/lib/helpers/exampleHelper.ts
type ExampleInput = {
	value: number
}

export function mapExample(input: ExampleInput): number {
	// Keep helper logic deterministic and side-effect free unless explicitly required.
	return Math.max(0, input.value)
}
```

Checklist for helper additions:

- [ ] File name is descriptive and ends with `Helper.ts`.
- [ ] API is narrow and explicit.
- [ ] Behavior is deterministic unless helper purpose is side-effect orchestration.
- [ ] A unit test was added or updated in `tests/unit`.
- [ ] Existing helper was extended instead of creating parallel logic (if applicable).

## Component Change Checklist

Use this checklist for route/component markup, behavior, or styling changes.

- [ ] Semantic structure remains valid (headings, landmarks, button/link usage).
- [ ] Keyboard interaction still works end-to-end.
- [ ] Focus management remains correct for dialogs/navigation transitions.
- [ ] User-facing copy follows i18n patterns.
- [ ] Tailwind/Svelte patterns match project conventions.
- [ ] Component-level tests were updated if behavior changed.
- [ ] Relevant e2e specs were run for user-observable flow changes.

## Suggested Validation Matrix

Use the smallest set that gives confidence for your change:

1. Docs-only:
   - `npm run check`
   - `npm run lint`
2. Helper or route logic:
   - `npm run verify`
3. Navigation, settings, focus, a11y, or results flow:
   - `npm run verify`
   - targeted Playwright specs with `npx playwright test --project=chromium --reporter=line <specs>`
4. Standard integrated confidence:
   - `npm test`
   - Includes `verify`, comprehensive Chromium e2e, and Firefox/WebKit smoke coverage.
5. Release-sensitive changes:
   - Run the relevant independent checks: `npm run test:unit:coverage`, `npm run test:e2e:full:production`, `npm run test:bundle`, and `npm run test:perf`.
