import type { Experiment } from "./contracts.js";
import { canTransition, validateProposal } from "./validation.js";
export interface EvaluationEvidence {
  testSuiteId: string;
  passed: number;
  failed: number;
  executionLogId: string;
  evaluatorIdentity: string;
  evaluatorVersion: string;
}
export interface EvaluationDecision { accepted: boolean; reason: string; nextStatus: "accepted" | "rejected"; }
/** The evaluator is supplied independently. Generated self-reports are not test evidence. */
export function evaluateExperiment(
  experiment: Experiment,
  evidence: EvaluationEvidence,
  trustedEvaluatorIdentity: string
): EvaluationDecision {
  const reasons: string[] = [];
  if (experiment.status !== "testing") reasons.push("Experiment is not in testing state");
  if (!canTransition(experiment.status, "accepted")) reasons.push("Illegal acceptance transition");
  if (!evidence.executionLogId.trim()) reasons.push("No independent execution log");
  if (!evidence.testSuiteId.trim()) reasons.push("No test suite");
  if (!evidence.evaluatorVersion.trim()) reasons.push("Unversioned evaluator");
  if (evidence.evaluatorIdentity !== trustedEvaluatorIdentity) reasons.push("Untrusted evaluator");
  if (!Number.isInteger(evidence.passed) || !Number.isInteger(evidence.failed) || evidence.passed < 1 || evidence.failed !== 0)
    reasons.push("Tests did not all pass");
  if (validateProposal({ ...experiment, status: "proposed" }).length)
    reasons.push("Proposal lacks required provenance or falsification criteria");
  return { accepted: reasons.length === 0, reason: reasons.join("; ") || "External evidence meets baseline acceptance checks", nextStatus: reasons.length ? "rejected" : "accepted" };
}
