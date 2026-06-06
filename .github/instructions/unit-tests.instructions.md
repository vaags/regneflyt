---
description: 'Use when editing unit tests to keep tests deterministic, focused, and aligned with repository testing patterns.'
name: 'Regneflyt Unit Tests'
applyTo: 'tests/unit/**/*.ts,tests/unit/**/*.svelte.ts'
---

# Regneflyt Unit Test Rules

- Keep unit tests deterministic. Avoid fixed sleeps, implicit timing assumptions, and randomized expectations.
- For time-dependent logic, prefer controlled timers (for example `vi.useFakeTimers`) over real-time waits.
- Reuse existing test fixtures, factories, and harness helpers before adding new setup utilities.
- Keep assertions focused on behavior and invariants, not incidental implementation details.
- When helper or domain logic changes, add or update regression tests for the affected behavior.
- Prefer explicit, type-safe test data over loose object literals.
- Keep mocks minimal and local; avoid over-mocking shared behavior that can be tested directly.
- Avoid broad snapshot assertions unless the snapshot is the explicit contract under test.
- Follow existing naming and file placement patterns in `tests/unit`.
