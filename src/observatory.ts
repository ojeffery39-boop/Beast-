import type { BeastEvent, EventKind, Worker } from "./contracts.js";

const actors: readonly Worker[] = ["explorer", "builder", "watchdog", "scheduler"];
const kinds: readonly EventKind[] = ["run.created", "run.started", "tool.called", "source.retrieved", "memory.retrieved", "proposal.created", "test.completed", "watchdog.verdict", "run.completed", "run.failed", "scheduler.idle"];
export interface EventInput {
  id: string; runId: string; actor: Worker; kind: EventKind;
  at: string; tenantId: string; summary: string; evidenceIds: string[];
  metadata?: Record<string, string | number | boolean | null>;
}
export function validateEvent(event: EventInput): string[] {
  const errors: string[] = [];
  if (![event.id, event.runId, event.tenantId].every(v => typeof v === "string" && v.trim().length > 0)) errors.push("missing event identity");
  if (!actors.includes(event.actor)) errors.push("unknown actor");
  if (!kinds.includes(event.kind)) errors.push("unknown event kind");
  if (!Number.isFinite(Date.parse(event.at))) errors.push("invalid timestamp");
  if (typeof event.summary !== "string" || !event.summary.trim() || event.summary.length > 2000) errors.push("invalid summary");
  if (!Array.isArray(event.evidenceIds) || event.evidenceIds.some(x => typeof x !== "string")) errors.push("invalid evidence");
  if (event.metadata && (Object.values(event.metadata).some(v => typeof v === "string" && v.length > 2000) || JSON.stringify(event.metadata).length > 8000)) errors.push("oversized metadata");
  return errors;
}
/** Local development implementation; not persistent, authenticated, or a hosted API. */
export class InMemoryObservatory {
  private readonly events = new Map<string, BeastEvent>();
  append(event: EventInput): BeastEvent {
    const errors = validateEvent(event);
    if (errors.length) throw new Error(errors.join("; "));
    const key = JSON.stringify([event.tenantId, event.id]);
    if (this.events.has(key)) throw new Error("duplicate event id");
    const copy: BeastEvent = {
      ...event,
      evidenceIds: [...event.evidenceIds],
      metadata: event.metadata ? { ...event.metadata } : undefined,
    };
    this.events.set(key, copy);
    return structuredClone(copy);
  }
  list(tenantId: string, limit = 100): BeastEvent[] {
    if (!tenantId.trim()) throw new Error("tenant required");
    return [...this.events.values()]
      .filter(event => event.tenantId === tenantId)
      .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
      .slice(-Math.max(0, Math.min(500, Math.trunc(limit))))
      .map(event => structuredClone(event));
  }
  forRun(tenantId: string, runId: string): BeastEvent[] {
    return this.list(tenantId, 500).filter(event => event.runId === runId);
  }
}
