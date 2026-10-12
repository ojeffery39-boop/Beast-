/** Public, portable data contracts. No secrets or private memories. */
export type Worker = "explorer" | "builder" | "watchdog" | "scheduler";
export type RunStatus = "proposed" | "executing" | "executed" | "testing" | "accepted" | "rejected" | "failed";
export type EventKind = "run.created" | "run.started" | "tool.called" | "source.retrieved" | "memory.retrieved" | "proposal.created" | "test.completed" | "watchdog.verdict" | "run.completed" | "run.failed" | "scheduler.idle";

export interface EvidenceRef {
  id: string;
  url?: string;
  title?: string;
  retrievedAt: string;
  contentHash?: string;
}

export interface BeastEvent {
  id: string;
  runId: string;
  actor: Worker;
  kind: EventKind;
  at: string;
  /** Pseudonymous tenant identifier. Never expose to another tenant. */
  tenantId: string;
  summary: string;
  evidenceIds: string[];
  /** Sanitized telemetry only, never credentials or private reasoning. */
  metadata?: Record<string, string | number | boolean | null>;
}

export interface Experiment {
  id: string;
  tenantId: string;
  explorerRunId: string;
  builderRunId?: string;
  hypothesis: string;
  falsificationCriteria: string;
  evidence: EvidenceRef[];
  status: RunStatus;
  evaluatorVersion?: string;
  verdictReason?: string;
}
