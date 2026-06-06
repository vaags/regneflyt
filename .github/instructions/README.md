# Regneflyt Scoped Instructions Index

This folder contains file-scoped agent instruction files used for focused, path-based guidance.

## How To Use

- Start with [AGENTS.md](../../AGENTS.md) for routing, precedence, and tie-breakers.
- Apply rules from the matching `*.instructions.md` file(s) based on `applyTo` patterns.
- Keep repository-wide defaults in [copilot-instructions.md](../copilot-instructions.md).

## Current Instruction Files

- `svelte-tailwind.instructions.md`: Svelte markup and Tailwind usage for routes/components.
- `i18n.instructions.md`: translated UI text, locale messages, and Paraglide constraints.
- `e2e-accessibility.instructions.md`: Playwright E2E accessibility and interaction flow guidance.
- `offline-service-worker.instructions.md`: service worker, offline fallback, and update lifecycle behavior.
- `typescript-strictness.instructions.md`: strict TypeScript practices for source and tests.
- `helpers.instructions.md`: helper-layer reuse-first, deterministic logic, and side-effect boundaries.
- `unit-tests.instructions.md`: deterministic unit-test structure and regression expectations.

## Naming And Scope Conventions

- Use lowercase kebab-case names ending with `.instructions.md`.
- Use precise `applyTo` globs; prefer narrow patterns over broad catch-alls.
- Keep rules imperative, enforceable, and concise.

## When To Add Or Split An Instruction File

Add or split when one of these is true:

- Recurring review comments appear in a specific path/domain.
- A domain needs constraints that do not belong in repository-wide defaults.
- Existing instruction files become hard to scan or mix unrelated concerns.

Do not add a new file for one-off wording preferences.
