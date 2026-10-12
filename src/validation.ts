import type { Experiment, RunStatus } from "./contracts.js";

/** Pure guard, not a substitute for independently run tests or authorization. */
const transitions: Record<RunStatus, readonly RunStatus[]> = {
  proposed: ["executing", "rejected", "failed"],
  executing: ["executed", "failed"],
  executed: ["testing", "failed"],
  testing: ["accepted", "rejected", "failed"],
  accepted: [],
  rejected: [],
  failed: [],
};

export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return transitions[from].includes(to);
}

export function validateProposal(experiment: Experiment): string[] {
  const problems: string[] = [];
  if (!experiment.id || !experiment.tenantId || !experiment.explorerRunId) problems.push("missing identity or provenance");
  if (experiment.hypothesis.trim().length < 15) problems.push("hypothesis too short");
  if (experiment.falsificationCriteria.trim().length < 15) problems.push("missing meaningful falsification criteria");
  if (experiment.status !== "proposed") problems.push("new proposal must start as proposed");
  return problems;
}
