---
description: 'Critically review the staged changes across UX, pedagogy, complexity/ROI, accessibility, i18n, type safety, and test coverage before committing.'
mode: 'agent'
---

# Review Staged Changes

Critically review the currently staged changes. Be direct and skeptical: surface real problems, not reassurance. If something is fine, say so briefly and move on.

## Gather context first

- Inspect the staged diff (e.g. `git --no-pager diff --staged`).
- Read enough surrounding code to judge each change in context, not in isolation.
- Identify which scoped instruction files in `.github/instructions/` apply to the changed paths and hold the changes to those rules.

## Review lenses

Assess the staged changes against each lens. Skip a lens only when clearly irrelevant, and say so.

- **Correctness & regressions**: Logic errors, broken edge cases, changed behavior that is not intended or not disclosed to the user.
- **Pedagogy**: Does the change serve the learner? Does it make the math training clearer, fairer, or better targeted to skill level?
- **UX**: Flow, clarity, and whether existing behavior changes silently. Flag any behavior change that the user is not informed about.
- **Complexity & ROI**: Is the added complexity justified by real value? Call out over-engineering, premature abstraction, and features that cost more than they return.
- **Accessibility**: Semantic HTML, keyboard support, focus handling, and WCAG 2.2 AAA expectations.
- **i18n**: No hardcoded user-facing strings. New copy uses Paraglide messages and sounds natural in Norwegian (nb). Tests reference messages, not hardcoded text.
- **Type safety**: Strict typing preserved, no unjustified `any`, exhaustive control flow, reuse of existing models and registries.
- **Reuse & duplication**: Existing helpers, stores, components, and patterns reused before adding parallel logic. Flag duplication that points to a shared abstraction or lint rule.
- **Tests**: Adequate regression and behavior coverage for the change. Note untested paths.
- **Comments**: Comments added only where they aid maintenance; prefer self-documenting code.

## Output

1. A short overall verdict: is this change a meaningful improvement, and is it safe to commit?
2. Findings grouped by severity (blocking / should-fix / optional), each with the file and a concrete fix.
3. Any untested or risky paths to verify before committing.

Do not commit, stage, or run Git write operations. Stop after presenting the review.
