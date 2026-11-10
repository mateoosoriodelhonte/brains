import { test } from "node:test";
import assert from "node:assert/strict";
import { LearnerProfile } from "../src/LearnerWorkspace/LearnerProfile.js";
import { LocalStorageGateway } from "../src/LocalStorageGateway/LocalStorageGateway.js";
import { FakeStorage } from "./fixtures.js";

test("SQL-looking input remains literal JSON data across save and reload", () => {
  const storage = new FakeStorage();
  const workspace = new LearnerProfile(new LocalStorageGateway(() => storage));
  workspace.load();
  const original = workspace.submitTask("Keep this task", "2026-11-10");
  const originalNote = workspace.createNote(
    "Keep this note",
    "CS 2450",
    "Original content",
  );
  const tag = workspace.createTag("' OR 1=1 --");
  const payload = "'); DROP TABLE tasks; --";
  workspace.submitTask(payload, "2026-11-11", "SELECT * FROM notes;", [tag.id]);
  workspace.createNote(payload, "' OR 1=1 --", "'); DELETE FROM notes; --", [
    tag.id,
  ]);

  const restored = new LearnerProfile(new LocalStorageGateway(() => storage));
  const snapshot = restored.load();
  assert.equal(snapshot.loadError, "");
  assert.deepEqual(restored.records(), workspace.records());
  assert.equal(snapshot.tasks.length, 2);
  assert.equal(snapshot.notes.length, 2);
  assert.equal(
    snapshot.tasks.find((task) => task.id === original.id).title,
    "Keep this task",
  );
  assert.equal(
    snapshot.notes.find((note) => note.id === originalNote.id).content,
    "Original content",
  );
  assert.equal(snapshot.tasks[1].title, payload);
  assert.equal(snapshot.notes[1].content, "'); DELETE FROM notes; --");
  assert.equal(snapshot.tags[0].name, "' OR 1=1 --");
});

test("query-like identifiers cannot select other records or change saved state", () => {
  const storage = new FakeStorage();
  const workspace = new LearnerProfile(new LocalStorageGateway(() => storage));
  workspace.load();
  workspace.submitTask("Keep pending", "2026-11-10");
  workspace.createNote("Keep unchanged", "CS 2450", "Original");
  const before = workspace.records();
  const raw = storage.raw;
  const writes = storage.writes;
  const payload = "' OR 1=1 --";
  assert.throws(() => workspace.completeTask(payload), /could not be found/);
  assert.throws(
    () => workspace.editNote(payload, "Changed", "CS 2450", "Changed"),
    /could not be found/,
  );
  assert.throws(
    () => workspace.submitTask("Unknown tag", "2026-11-10", "", [payload]),
    /tag/,
  );
  assert.deepEqual(workspace.records(), before);
  assert.equal(storage.raw, raw);
  assert.equal(storage.writes, writes);
});
