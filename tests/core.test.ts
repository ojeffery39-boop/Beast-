import { test } from "node:test";
import { strict as assert } from "node:assert";
import { canTransition, validateProposal } from "../src/validation.js";
import { evaluateExperiment } from "../src/evaluator.js";
import { retrieveMemories, validateMemory } from "../src/memory.js";
import type { Experiment } from "../src/contracts.js";

const proposal: Experiment = {
  id: "p1", tenantId: "u1", explorerRunId: "r1",
  hypothesis: "Independent checks reduce false acceptances",
  falsificationCriteria: "Reject if held-out failures exceed baseline",
  evidence: [], status: "proposed"
};
test("candidate cannot jump from proposal to accepted", () => {
  assert.equal(canTransition("proposed", "accepted"), false);
  assert.equal(canTransition("testing", "accepted"), true);
  assert.deepEqual(validateProposal(proposal), []);
});
test("watchdog rejects untrusted evaluator", () => {
  const result = evaluateExperiment({ ...proposal, status: "testing" },
    { testSuiteId: "suite", passed: 5, failed: 0, executionLogId: "log", evaluatorIdentity: "candidate", evaluatorVersion: "v1" },
    "external-judge");
  assert.equal(result.accepted, false);
});
test("watchdog rejects missing tests and accepts verified evidence", () => {
  const evidence = { testSuiteId: "suite", passed: 5, failed: 0, executionLogId: "log", evaluatorIdentity: "external-judge", evaluatorVersion: "v1" };
  assert.equal(evaluateExperiment({ ...proposal, status: "testing" }, evidence, "external-judge").accepted, true);
  assert.equal(evaluateExperiment({ ...proposal, status: "testing" }, { ...evidence, failed: 1 }, "external-judge").accepted, false);
});
test("memory retrieval isolates tenants and retractions", () => {
  const base = { kind: "observation" as const, sourceIds: ["s1"], createdAt: "2026-10-12T00:00:00Z", confidence: 0.8 };
  const memories = [
    { ...base, id: "1", tenantId: "u1", text: "The raven solves puzzles" },
    { ...base, id: "2", tenantId: "u2", text: "The raven is secret" },
    { ...base, id: "3", tenantId: "u1", text: "The raven was wrong", retracted: true }
  ];
  assert.deepEqual(retrieveMemories(memories, "u1", "raven").map(m => m.id), ["1"]);
  assert.deepEqual(validateMemory(memories[0]), []);
});
