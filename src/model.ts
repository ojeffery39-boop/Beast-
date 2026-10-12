/** Provider-independent model contract. Adapters must be supplied by the host. */
export interface ModelMessage { role: "system" | "user" | "assistant" | "tool"; content: string; }
export interface ModelUsage { inputTokens?: number; outputTokens?: number; costUsd?: number; }
export interface ModelResult { text: string; model: string; usage?: ModelUsage; finishReason?: string; }
export interface ModelAdapter {
  readonly id: string;
  complete(messages: readonly ModelMessage[], options?: { maxOutputTokens?: number; temperature?: number; signal?: AbortSignal }): Promise<ModelResult>;
}
export interface ModelPolicy {
  primary: string;
  fallback: readonly string[];
  maxOutputTokens: number;
  maxCallsPerRun: number;
  maxEstimatedCostUsd: number;
}
export async function invokeWithFallback(
  adapters: ReadonlyMap<string, ModelAdapter>, policy: ModelPolicy,
  messages: readonly ModelMessage[],
  onAttempt?: (event: { model: string; ok: boolean; error?: string }) => Promise<void>
): Promise<ModelResult> {
  const order = [policy.primary, ...policy.fallback];
  if (policy.maxCallsPerRun < 1 || policy.maxOutputTokens < 1) throw new Error("Invalid model budget");
  let lastError: unknown;
  for (const id of order.slice(0, policy.maxCallsPerRun)) {
    const adapter = adapters.get(id);
    if (!adapter) { lastError = new Error("Model adapter unavailable: " + id); continue; }
    try {
      const result = await adapter.complete(messages, { maxOutputTokens: policy.maxOutputTokens });
      if (!result.text.trim()) throw new Error("Empty model output");
      if (result.usage?.costUsd !== undefined && result.usage.costUsd > policy.maxEstimatedCostUsd)
        throw new Error("Model call exceeded budget; do not continue");
      await onAttempt?.({ model: id, ok: true });
      return result;
    } catch (error) {
      lastError = error;
      await onAttempt?.({ model: id, ok: false, error: error instanceof Error ? error.message : "unknown error" });
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No usable model");
}
