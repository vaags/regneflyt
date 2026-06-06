---
description: 'Use when editing helper-layer logic to enforce reuse-first discovery, deterministic design, and side-effect boundaries.'
name: 'Regneflyt Helpers'
applyTo: 'src/lib/helpers/**/*.ts'
---

# Regneflyt Helper Rules

- Before adding a new helper, search for an existing helper to extend or reuse.
- Follow the discovery and placement workflow in `docs/development/HELPER_DISCOVERY_AND_PLACEMENT.md`.
- Prefer extending nearby helpers over creating parallel logic for the same concept.
- Keep helper APIs narrow. Avoid optional parameter growth that hides behavior branches.
- Default to deterministic and side-effect-free helper logic.
- When side effects are necessary, isolate them behind explicit runtime contracts and keep core logic pure.
- Place helpers by domain and follow existing naming conventions used in nearby helper files.
- Reuse existing models, constants, and stores instead of duplicating state or derived logic.
- Add or update focused unit tests when helper behavior changes.
