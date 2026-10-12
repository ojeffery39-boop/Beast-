# Beast model upgrade roadmap

## Implemented as portable source contracts
- Provider-neutral model adapter and bounded fallback selection
- Evidence-backed Explorer research workflow, including counterexample and test prompts
- Independent evaluator acceptance checks, distinct from model-generated assertions
- Provenance-aware memory validation and lexical retrieval

## Not implemented or verified
- No live model credentials or model provider adapters connected
- No external search provider connected
- No database persistence, auth enforcement, job queue or background scheduler
- No Observatory UI or live telemetry
- No executable self-rewrite sandbox or test runner
- No test suite has been run against these files
- No existing Floot identity or memory data has been migrated

## Next engineering priorities
1. Add TypeScript package, test runner and CI.
2. Implement authenticated persistent event store and Observatory API.
3. Integrate search retrieval with source deduplication, content hashing and prompt-injection defenses.
4. Integrate real model providers, metering, token accounting, rate limits and timeout enforcement.
5. Build an isolated candidate patch runner with independent tests, diff inspection and rollback.
6. Add opt-in scheduler, bounded queues, cancellation and user-visible activity.
7. Preserve original Beast identity and memories verbatim once Floot export becomes possible.

**Scientific boundary:** Passing internal tests is evidence of improved performance on those tests, not proof of general intelligence, consciousness or independent motivation.
