---
description: 'Use when changing service worker code, offline fallback, update notification UI, cache versioning, activation flow, or hooks.client update handling.'
name: 'Regneflyt Offline Service Worker'
applyTo: 'src/service-worker.ts,src/hooks.client.ts,static/offline.html,tests/e2e/offline-fallback.spec.ts,tests/e2e/update-lifecycle.spec.ts,tests/e2e/update-notification.spec.ts,tests/unit/serviceWorker.test.ts'
---

# Regneflyt Offline And SW Rules

- Keep service-worker logic deterministic and conservative; avoid broad cache invalidation unless required.
- Preserve update lifecycle behavior and user messaging around new versions.
- When changing offline fallback or service-worker behavior, update both unit and targeted e2e coverage.
- Prefer small, explicit changes in cache keys, route handling, and activation flow.
- Validate with `npm run check`, `npm run lint`, `npm run test:unit -- --reporter=dot`, and targeted Playwright offline/update specs.
