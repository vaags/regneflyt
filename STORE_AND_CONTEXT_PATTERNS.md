# Store And Context Patterns

This guide explains how to choose between route-local state, shared stores, contexts, and URL-driven state.

## Quick Decision Flow

1. Is the state only needed inside one route or one component tree?
   - Use route-local or component-local state.
2. Must the state survive page reloads?
   - Use a persisted shared store.
3. Is the state needed by many distant components over time?
   - Use a shared store.
4. Is it an action contract between layout and nested routes/components?
   - Use context.
5. Should the state be shareable via links and browser navigation?
   - Put it in URL/query params and derive from route data.

## When To Use What

### Route-local or component-local state

Use this when data is temporary and only meaningful to the current route or component instance.

Good fits:

- temporary UI toggles
- in-progress form state
- per-route transition flags

Examples:

- route-level orchestration state in src/routes/+layout.svelte
- quiz/menu route-local state in src/routes/+page.svelte

### Shared stores

Use shared stores for cross-route state that multiple features read or write.

Good fits:

- theme preference
- adaptive profile/progress
- global toast state
- results history

Canonical import rule:

- import shared store APIs from src/lib/stores.ts
- avoid mixed import paths for the same store APIs

### Contexts

Use context for scoped action contracts from parent composition roots to descendants.

Good fits:

- parent-owned navigation guards exposed to child routes
- route-level actions that should not be global app state
- capability-style contracts (register actions, trigger parent behavior)

Examples:

- src/lib/contexts/quizLeaveNavigationContext.ts
- src/lib/contexts/settingsRouteContext.ts
- src/lib/contexts/stickyGlobalNavContext.ts

### URL/query as source of truth

Use URL/query params when users should be able to refresh, share, and revisit exact configuration/state.

Good fits:

- quiz setup configuration
- deterministic seed and replay mode
- route-to-route preserved menu/settings choices

Examples:

- src/lib/helpers/urlParamsHelper.ts
- src/lib/helpers/quizHelper.ts

## Store Implementation Primitives

Three internal factories in `stores.svelte.ts` cover all state needs. Do not reach past them to raw `$state` / `$derived` in module scope.

### `createStateRef<T>(initialValue)`

Wraps a `$state` rune and exposes `.current`, `.set()`, and `.update()`.

Use for: simple reactive module-level state with no persistence.

Examples: `activeToast`, `storageWriteError`, `devToolsEnabled`

### `createDerivedRef<T>(getValue)`

Wraps `$derived.by(getValue)` and exposes a readonly `.current`.

Use for: computed values derived from one or more other state refs.

Examples: `overallSkill` (mean of `adaptiveSkills`), `showDevTools`

### `createPersistedStore<T>(key, getDefault, parseFromStorage, onChange?)`

Extends `createStateRef` with localStorage read-on-init, write-on-change, and an optional side-effect callback. Handles SSR (`typeof window === 'undefined'`) and parse/write errors gracefully via `console.warn`.

Use for: state that must survive page reloads.

Examples: `adaptiveSkills`, `lastResults`, `onboardingCompleted`, `theme`

`onChange` is the right place for one-shot side effects tied to value changes (e.g. setting a cookie for `theme`). Do not use it for derived state — use `createDerivedRef` for that.

## Anti-Patterns To Avoid

1. Promoting local UI state to shared store without clear cross-route need.
2. Using context for globally shared data that belongs in stores.
3. Duplicating URL-derived state into stores and letting them drift.
4. Adding new stores when an existing store already models the same concept.
5. Importing shared stores through inconsistent paths.

## Practical Checklist

Before adding new state, answer these questions:

1. Who owns this state lifecycle?
2. Does it need persistence?
3. Does it need deep-tree access without prop threading?
4. Should it be represented in URL for navigation/shareability?
5. Can existing store/context abstractions already solve it?

If two or more answers are unclear, prefer local state first and promote only when repeated pressure appears.
