# Architecture and migration plan

## Roles

**Explorer:** chooses questions, retrieves sources, distinguishes evidence from speculation, proposes falsifiable experiments. Cannot approve its own conclusions.

**Builder:** receives a linked Explorer proposal, prepares a code diff and reproducible test plan. Cannot directly change production or evaluator policy.

**Watchdog:** independently evaluates safety, provenance, regression tests, resource budgets and rollback. Records its verdict and evidence. A mere length check is not sufficient.

**Scheduler:** invokes authorized tasks at configured intervals with leases, cooldowns, budgets, retries and a kill switch. A request handler alone is not a background worker.

**Observatory:** queries timestamped, per-user events with links to run IDs and source IDs. Reports missing instrumentation honestly. No fabricated stream of internal thoughts.

## Trust boundaries

1. Candidate modifications cannot edit evaluation criteria, hidden tests, acceptance policy or watchdog permissions.
2. Proposal, execution and verification are distinct, linked records.
3. Store secrets in host environment or secret manager, never source files or event payloads.
4. Never commit private user chat histories or memory databases to a public repository.
5. Production deployment and paid-resource provisioning require explicit authorization.

## Migration status

GitHub repository initialized independently of Floot. The original Floot source cannot yet be read because its daily build-action limit is exhausted. No database export has been performed. Existing Beast identity, memory and source code remain in Floot until verified migration.

## Initial verification checklist

- Contract typechecks with TypeScript
- Unit tests reject unsupported state transitions
- Authenticated users cannot see another user's events
- Explorer source URLs and fetched content are stored with provenance
- Watchdog rejection prevents deployment
- Scheduler survives process restart and respects stop switch
- Mobile PWA reports offline state correctly
