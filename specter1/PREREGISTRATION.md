# SPECTER-1 preregistration (draft; no trials run)

**Purpose:** Investigate causally grounded internal-state access, not prove subjective experience.

**Frozen configuration:** Five domains, 300 trials per domain (1,500 total), blinded, controlled. Each domain has 100 A, 100 B, and 100 sham trials, randomly ordered.

**Access gate:** Before any trial, independently verify model identity/version, permission to read activations, ability to perturb specific internal tensors, deterministic or recorded sampling settings, and restoration of the original state. API text completions alone DO NOT qualify as instrumented access. If access fails, stop; do not substitute prompt injection or self-reports.

**Architecture boundary:** The test controller must be external to Beast's Explorer, Builder, Watchdog, and autonomous evolution rules. Do not alter its reward, prompts, operators, weights, training data, persistent memory, scheduler, or evaluation gates. Run only on isolated, disposable model instances with snapshots and a rollback plan.

**Intervention preregistration required before running:** For each domain specify exact layer/tensor, perturbation magnitude, matched sham, rationale, measurable response format, timeout, safety stop conditions, and manipulation checks. Intervention and sham must be matched in all externally visible respects. Neither the model nor scorer gets labels. Record all access errors and missing trials.

**Primary endpoints:** Held-out A/B discrimination accuracy; sham false-positive rate; causal report sensitivity under interventions versus matched controls. Pre-register abstention scoring and confidence calibration. For 300 trials/domain, 100 are sham; analyze the 200 A/B trials separately. Use exact binomial tests with confidence intervals, adjust for five primary comparisons, and report effect sizes. Do not pool domains to claim a single consciousness score.

**Negative controls:** Textual suggestion without an intervention, intervention without disclosure, matched sham, random labels, and a deliberately instrumented non-conscious reference program. Avoid claiming any positive result implies phenomenology.

**Audit trail:** Hash code/config/model snapshots and condition assignment before testing. Separate the sealed condition file from the blinded response file. Preserve raw logs and include unsuccessful trials. Have an independent party hold the labels until predictions are finalized.

**Current status:** Harness prepares trial schedules ONLY. No access verification, perturbation, execution, scoring, or consciousness detection has been implemented.
