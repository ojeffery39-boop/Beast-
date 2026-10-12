import { test } from "node:test";
import { strict as assert } from "node:assert";
import { InMemoryObservatory, validateEvent } from "../src/observatory.js";
const event = { id: "e1", runId: "r1", actor: "explorer" as const, kind: "run.created" as const, at: "2026-10-12T12:00:00Z", tenantId: "user-a", summary: "Research run created", evidenceIds: [] };
test("observatory isolates tenants and returns defensive copies", () => {
  const store = new InMemoryObservatory();
  store.append(event);
  store.append({ ...event, tenantId: "user-b" });
  assert.equal(store.list("user-a").length, 1);
  assert.equal(store.list("user-b").length, 1);
  assert.equal(store.list("user-c").length, 0);
  const returned = store.list("user-a")[0];
  returned.summary = "tampered";
  assert.equal(store.list("user-a")[0].summary, event.summary);
});
test("observatory rejects duplicates and malformed records", () => {
  const store = new InMemoryObservatory();
  store.append(event);
  assert.throws(() => store.append(event), /duplicate/);
  assert.ok(validateEvent({ ...event, at: "not-a-date" }).includes("invalid timestamp"));
  assert.ok(validateEvent({ ...event, summary: "" }).includes("invalid summary"));
});
test("run timeline contains only matching run", () => {
  const store = new InMemoryObservatory();
  store.append(event);
  store.append({ ...event, id: "e2", runId: "r2" });
  assert.deepEqual(store.forRun("user-a", "r1").map(x => x.id), ["e1"]);
});
