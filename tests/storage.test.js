import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LocalStorageGateway,
  STORAGE_KEY,
} from "../src/LocalStorageGateway/LocalStorageGateway.js";
import { LearnerProfile } from "../src/LearnerWorkspace/LearnerProfile.js";
import { FakeStorage } from "./fixtures.js";

test("versioned storage round trip loads all records in one read", () => {
  const storage = new FakeStorage();
  const profile = new LearnerProfile(new LocalStorageGateway(() => storage));
  profile.load();
  profile.submitTask("A task", "2026-11-05");
  profile.completeTask(profile.records().tasks[0].id);
  const envelope = JSON.parse(storage.raw);
  assert.equal(envelope.version, 1);
  const restored = new LearnerProfile(new LocalStorageGateway(() => storage));
  restored.load();
  assert.deepEqual(restored.records(), profile.records());
  assert.equal(storage.reads, 2); // One read per load, never one per task.
  assert.equal(STORAGE_KEY, "brains.workspace");
});

test("malformed JSON and unsupported versions are kept untouched and never overwritten", () => {
  for (const raw of ["{broken", "null", '{"version":2,"workspace":{}}', "{}"]) {
    const storage = new FakeStorage(raw);
    const gateway = new LocalStorageGateway(() => storage);
    const profile = new LearnerProfile(gateway);
    assert.match(profile.load().loadError, /untouched|unreadable|unsupported/);
    assert.throws(() => profile.submitTask("Task", "2026-11-05"), /disabled/);
    assert.throws(() => gateway.save({}), /disabled/);
    assert.equal(storage.raw, raw);
    assert.equal(storage.writes, 0);
  }
});

test("storage property access and read failures show understandable errors and disable writes", () => {
  const profile = new LearnerProfile(
    new LocalStorageGateway(() => {
      throw new Error("Denied");
    }),
  );
  assert.match(profile.load().loadError, /unavailable/);
  assert.throws(() => profile.createTag("Tag"), /disabled/);
  const storage = new FakeStorage();
  storage.failRead = true;
  assert.throws(
    () => new LocalStorageGateway(() => storage).load(),
    /unavailable/,
  );
});

test("quota failure gives no successful mutation and preserves existing raw JSON", () => {
  const storage = new FakeStorage();
  const profile = new LearnerProfile(new LocalStorageGateway(() => storage));
  profile.load();
  profile.submitTask("Existing", "2026-11-05");
  const raw = storage.raw;
  storage.failWrite = true;
  assert.throws(
    () => profile.submitTask("Unsaved", "2026-11-05"),
    /Could not save/,
  );
  assert.equal(storage.raw, raw);
  assert.equal(profile.getSnapshot().tasks.length, 1);
});

test("a later unreadable load revokes an earlier successful load's write permission", () => {
  const storage = new FakeStorage();
  const gateway = new LocalStorageGateway(() => storage);
  gateway.load();
  storage.raw = "{broken";
  assert.throws(() => gateway.load(), /unreadable/);
  assert.throws(() => gateway.save({}), /disabled/);
  assert.equal(storage.raw, "{broken");
});
