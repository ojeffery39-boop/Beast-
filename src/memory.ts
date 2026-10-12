export type MemoryKind = "observation" | "user_statement" | "hypothesis" | "verified_finding" | "correction";
export interface MemoryRecord {
  id: string; tenantId: string; kind: MemoryKind; text: string;
  sourceIds: string[]; createdAt: string; confidence: number;
  supersedesId?: string; retracted?: boolean;
}
export function validateMemory(memory: MemoryRecord): string[] {
  const errors: string[] = [];
  if (!memory.id || !memory.tenantId) errors.push("Missing identity");
  if (!memory.text.trim()) errors.push("Empty memory");
  if (!memory.sourceIds.length) errors.push("Memory lacks provenance");
  if (memory.confidence < 0 || memory.confidence > 1 || !Number.isFinite(memory.confidence)) errors.push("Invalid confidence");
  if (memory.kind === "verified_finding" && memory.sourceIds.length < 1) errors.push("Verified finding lacks evidence");
  return errors;
}
export function retrieveMemories(memories: readonly MemoryRecord[], tenantId: string, query: string, limit = 8): MemoryRecord[] {
  const terms = new Set((query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []));
  return memories.filter(m => m.tenantId === tenantId && !m.retracted)
    .map(m => ({ m, score: (m.text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).reduce((n, word) => n + (terms.has(word) ? 1 : 0), 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score || b.m.createdAt.localeCompare(a.m.createdAt))
    .slice(0, Math.max(0, Math.min(limit, 50))).map(x => x.m);
}
