---
description: 'Use when editing TypeScript source or tests to preserve strict typing, deterministic logic, and safe boundary handling.'
name: 'Regneflyt TypeScript Strictness'
applyTo: 'src/**/*.ts,tests/**/*.ts'
---

# Regneflyt TypeScript Strictness Rules

- Apply these rules together with any more specific scoped instruction file for the current path.
- Preserve strict typing. Do not weaken strictness or add `any` unless unavoidable.
- If `any` is unavoidable, keep it narrowly scoped and document why in a short code comment.
- For unknown input boundaries (URL, storage, external APIs), parse and narrow explicitly before use.
- Prefer explicit return types on exported functions and complex helpers.
- Keep shared helper logic deterministic by default. Isolate side effects behind explicit runtime interfaces.
- Prefer exhaustive control flow in discriminated unions and operator branches.
- Avoid broad unsafe assertions. Narrow through checks first and keep assertions local.
- Reuse existing models and schema parsers from `src/lib/models` before introducing parallel types.
- Keep changes small and behavior-preserving unless the task requires behavior changes.
