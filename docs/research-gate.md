# Beast research gate v1

This is an **independent deterministic evaluator**, not an autonomous Darwin-Gödel Machine.

- Fixed six-case logic benchmark (including invalid inference and converse errors).
- Exact-match answers: `yes`, `unknown`. No credit for confident unsupported inference.
- Fixed test-set SHA-256 to detect benchmark changes.
- Reject duplicates, failures, and candidates without strict score improvement.
- A passing benchmark is **not** proof of general reasoning or self-improvement.
- The evaluator currently exists as a library with tests. It is **not yet connected to a running research loop**, and does not modify Beast or authorize deployment.
- No production chat routes or secrets are changed.
- Render free temporary filesystem is ephemeral. Persistent experiment archives and conversation memory require a durable store before autonomous cycles can be trusted.

Run locally: `node --test tests/research-evaluator.test.mjs`
