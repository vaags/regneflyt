# Domain Architecture

Regneflyt keeps its training rules independent of the SvelteKit application so the most important behavior remains deterministic, testable, and reusable.

## Vocabulary

- **Arithmetic** defines operators and their mathematical identity.
- **Skill progression** models estimated learner skill and how answers change it.
- **Puzzle generation** turns quiz settings and skill into suitable arithmetic puzzles.
- **Quiz** defines quiz state and configuration models.
- **Integration** connects domain concepts to Paraglide, Svelte, SvelteKit, browser APIs, or persistence mechanisms.

Use `adaptive` as a modifier for the adaptive difficulty mode, not as the name of the whole training subsystem.

## Dependency Direction

Dependencies point inward:

```text
routes and components
        ↓
integrations and application helpers
        ↓
src/lib/domain
```

`src/lib/domain` must not import from Svelte, SvelteKit, Paraglide, stores, contexts, routes, components, browser globals, Vite environment flags, or compatibility modules under `src/lib/helpers`, `src/lib/models`, and `src/lib/constants`.

## Domain Areas

```text
src/lib/domain/
  arithmetic/          operator identity, signs, and families
  skill-progression/   operator skill state, updates, difficulty modes, and adaptive tuning
  puzzle-generation/   difficulty, selection, candidate evaluation, and construction
  quiz/                quiz state and configuration models
  shared/              small domain-wide primitives only
```

Do not add a top-level domain barrel. Import the module that owns the behavior so dependencies stay visible and tree-shaking remains predictable.

The domain directories are responsibility namespaces inside one training model,
not independent dependency layers or separately deployable packages. Cross-area
imports are acceptable when the behavior genuinely spans those responsibilities;
the module graph must remain acyclic.

## Integration Boundaries

Localized labels belong under `src/lib/integrations/paraglide`. Browser and framework behavior stays outside the domain even when it is plain TypeScript.

Examples that remain outside the domain:

- Svelte stores and contexts
- route navigation and URL mutation
- focus restoration and view transitions
- local storage and cookies
- service-worker lifecycle behavior
- localized labels and messages

## Validation

- `npm run check:domain` type-checks the domain without SvelteKit-generated configuration or DOM libraries.
- ESLint enforces forbidden domain imports and browser globals.
- `npm run verify` validates the integrated application and unit suite.
- `npm run test:bundle` guards client bundle size.
- Training-model changes additionally require deterministic offline analysis.
