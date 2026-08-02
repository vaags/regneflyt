---
description: 'Use when editing Svelte UI behavior that affects screen readers, focus, dialogs, forms, validation feedback, or route reachability.'
name: 'Regneflyt UX Invariants'
applyTo: 'src/routes/**/*.svelte,src/lib/components/**/*.svelte'
---

# Regneflyt UX Invariants

Behavioral accessibility rules. Visual rules live in `svelte-tailwind.instructions.md`.

## Live regions

- Render a live region unconditionally. Wrapping it in `{#if}` means assistive
  technology never observes the first update. Keep the region in the DOM and
  make only its contents conditional.
- Never wrap a per-second value in a live region. Announce threshold crossings
  instead.
- Reserve assertive announcements for errors and blocking state. Use `polite`
  everywhere else, including new-content announcements during gameplay.
- `aria-live="assertive"` belongs only to `ValidationMessageComponent`. Route
  validation errors through it rather than declaring the attribute inline.
- `role="alert"` is assertive too. `AlertComponent` sets it by default; pass
  `announce={false}` when the alert is an empty state rather than a problem, or
  when a surrounding live region already owns the announcement.

## Dialogs

- Create modal dialogs only through `DialogComponent`. Do not add a raw
  `<dialog>` element.
- Destructive confirmations focus the non-destructive action. Non-destructive
  dialogs keep the default close-button focus.

## Forms and validation

- Every `<form>` declares `onsubmit`. Use
  `onsubmit={(e) => { e.preventDefault(); ... }}` even when no submit button
  exists, so an implicit Enter submit cannot navigate.
- Editable text inputs that accept codes or identifiers set `autocomplete="off"`,
  `autocapitalize="none"`, `autocorrect="off"`, and `spellcheck="false"`. These
  do nothing on a `readonly` input; leave them off there.
- A visible validation error must be programmatically associated with the
  control it describes: set `aria-invalid` on the control and point
  `aria-describedby` at the error element's `id`. Associate at the `<fieldset>`
  level for group-wide errors such as a required selection, and at the control
  level for control-specific errors such as an invalid range.
- Render that error with `ValidationMessageComponent`, whose `id` is the target
  of `aria-describedby`.
- A `<fieldset>` of radios that needs `aria-invalid` must declare
  `role="radiogroup"`. The implicit `group` role does not support
  `aria-invalid`, and `svelte-check` warns when it is set anyway.
- A `<fieldset>` given an explicit `role` loses implicit `<legend>` naming. Add
  `aria-labelledby` pointing at the legend's `id`.

## Routes

- Register every user-reachable route in `tests/e2e/appRoutes.ts`. Accessibility
  and touch-target sweeps iterate that registry, so an unregistered route ships
  without coverage.
- Routes do not define their own `<h1>`; the single `<h1>` is the persistent app
  title in `AppShell`. Move post-navigation focus to `#main-content`.
- `#main-content` suppresses its native focus outline. It is a focus destination,
  not an operable control, so SC 2.4.7 and 2.4.13 do not apply, and the browser
  default would ring the entire page on the next keypress. Keep its
  `tabindex="-1"` and the `afterNavigate` focus move.

## Rule allowlists

- The touch-target sweep and the `no-restricted-syntax` UX bans carry no debt
  entries. Do not reintroduce an allowlist to make a check pass; fix the markup.
- The `no-restricted-syntax` UX bans in `eslint.config.js` are declared one per
  construct and composed with `uxBansExcept`. A component that owns a construct
  is listed in `ignores` on the general block and gets its own block that
  exempts only that ban, so it stays subject to every other one. Do not disable
  the rule wholesale, and do not add a second owner for an existing ban.
