import { test } from "node:test";
import assert from "node:assert/strict";
import { LearnerProfile } from "../src/LearnerWorkspace/LearnerProfile.js";
import { FakeGateway } from "./fixtures.js";

function setup() {
  const gateway = new FakeGateway();
  const profile = new LearnerProfile(gateway, {
    clock: () => new Date("2026-11-05T12:00:00Z"),
  });
  profile.load();
  return { profile, gateway };
}

test("FR-1: invalid submission leaves state and saved records unchanged with no write", () => {
  const { profile, gateway } = setup();
  profile.submitTask("Existing", "2026-11-05");
  const before = profile.records();
  assert.throws(() => profile.submitTask("   ", "2026-11-05"), /required/);
  assert.throws(() => profile.submitTask("Invalid date", ""), /due date/);
  assert.throws(
    () => profile.submitTask("Unknown tag", "2026-11-05", "", ["missing"]),
    /tag/,
  );
  assert.deepEqual(profile.records(), before);
  assert.deepEqual(gateway.saved, before);
  assert.equal(gateway.writes, 1);
});

test("FR-1/FR-4: zero or multiple tags save and reconstruct as shared objects", () => {
  const { profile, gateway } = setup();
  const a = profile.createTag("SUU");
  const b = profile.createTag("Certification");
  profile.submitTask("No tags", "2026-11-05");
  profile.submitTask("Tagged", "2026-11-06", "Practice", [a.id, b.id]);
  profile.createNote("Notes", "Security", "Content", [a.id]);
  const restored = new LearnerProfile(gateway);
  restored.load();
  assert.deepEqual(restored.records(), profile.records());
  assert.equal(
    restored.state.taskList.tasks[1].tags[0],
    restored.state.tags[0],
  );
  assert.equal(restored.state.notes[0].tags[0], restored.state.tags[0]);
  assert.equal(restored.state.taskList.tasks[0].tags.length, 0);
});

test("FR-3: complete, restore, return to pending, and restore again without deleting tasks", () => {
  const { profile, gateway } = setup();
  const task = profile.submitTask("Complete me", "2026-11-05");
  profile.completeTask(task);
  const restored = new LearnerProfile(gateway);
  restored.load();
  assert.equal(restored.getSnapshot().tasks[0].isComplete, true);
  restored.completeTask(task.id, false);
  const again = new LearnerProfile(gateway);
  again.load();
  assert.equal(again.getSnapshot().tasks[0].isComplete, false);
  assert.equal(again.getSnapshot().tasks.length, 1);
});

test("FR-4: blank or normalized duplicate tags are rejected without persistence", () => {
  const { profile, gateway } = setup();
  profile.createTag("  Cybersecurity  ");
  for (const name of ["", "   ", "cybersecurity", " CYBERSECURITY "]) {
    assert.throws(() => profile.createTag(name), /required|already exists/);
  }
  assert.equal(profile.getSnapshot().tags[0].name, "Cybersecurity");
  assert.equal(gateway.writes, 1);
});

test("FR-4: adding tags to existing items keeps existing tags", () => {
  const { profile } = setup();
  const a = profile.createTag("A"),
    b = profile.createTag("B");
  const task = profile.submitTask("Task", "2026-11-05", "", [a.id]);
  const note = profile.createNote("Note", "Course", "Text", [a.id]);
  profile.applyTags("task", task.id, [b.id]);
  profile.applyTags("note", note.id, [b.id, a.id]);
  assert.deepEqual(profile.records().tasks[0].tagIds, [a.id, b.id]);
  assert.deepEqual(profile.records().notes[0].tagIds, [a.id, b.id]);
});

test("FR-5: multi-tag OR filtering and clearing are read-only for tasks and notes", () => {
  const { profile, gateway } = setup();
  const a = profile.createTag("A"),
    b = profile.createTag("B");
  for (const [index, tags] of [
    [0, [a.id]],
    [1, [b.id]],
    [2, []],
  ]) {
    profile.submitTask(`Task ${index}`, "2026-11-05", "", tags);
    profile.createNote(`Note ${index}`, "Course", "Text", tags);
  }
  const writes = gateway.writes;
  assert.equal(profile.filterTasksByTag([a.id, b.id]).length, 2);
  assert.equal(profile.filterNotesByTag([a.id, b.id]).length, 2);
  assert.equal(profile.filterTasksByTag([]).length, 3);
  assert.equal(profile.filterNotesByTag([]).length, 3);
  assert.equal(gateway.writes, writes);
});

test("FR-6: editing and restoring notes updates edit date and preserves selected shared tags", () => {
  const { profile, gateway } = setup();
  const tag = profile.createTag("CS 2450");
  const note = profile.createNote("Before", "Lecture 1", "Initial", [tag.id]);
  profile.clock = () => new Date("2026-11-06T12:00:00.000Z");
  profile.editNote(
    note.id,
    "After",
    "Lecture 2",
    "<script>plain text</script>",
    [tag.id],
  );
  const restored = new LearnerProfile(gateway);
  restored.load();
  assert.equal(
    restored.records().notes[0].content,
    "<script>plain text</script>",
  );
  assert.equal(
    restored.records().notes[0].lastEdited,
    "2026-11-06T12:00:00.000Z",
  );
  assert.equal(restored.records().notes[0].title, "After");
  assert.deepEqual(restored.records().notes[0].tagIds, [tag.id]);
});

test("all failed writes leave previous valid memory and saved data intact", () => {
  const { profile, gateway } = setup();
  const tag = profile.createTag("Original");
  const task = profile.submitTask("Existing", "2026-11-05");
  const note = profile.createNote("Original", "Course", "Original");
  const before = profile.records();
  gateway.fail = true;
  for (const action of [
    () => profile.submitTask("New", "2026-11-05"),
    () => profile.submitTask("New", "2026-11-05", "", [], "Inline tag"),
    () => profile.editTask(task.id, "Changed", "2026-11-07", "Description"),
    () => profile.completeTask(task),
    () => profile.createTag("New"),
    () => profile.createNote("New", "Course", "New", [], "Inline tag"),
    () => profile.editNote(note.id, "Changed", "Course", "Changed", [], "Inline tag"),
    () => profile.applyTags("task", task.id, [tag.id], "Inline tag"),
  ]) {
    assert.throws(action, /unavailable/);
    assert.deepEqual(profile.records(), before);
    assert.deepEqual(gateway.saved, before);
  }
});

test("bad relationships, duplicate IDs, missing fields, and invalid domain data lock saving", () => {
  const { profile } = setup();
  profile.submitTask("Task", "2026-11-05");
  const valid = profile.records();
  const corruptions = [
    (records) => {
      records.tasks[0].tagIds = ["missing"];
    },
    (records) => {
      records.tasks.push({ ...records.tasks[0] });
    },
    (records) => {
      records.tasks[0].dueDate = "2026-02-30";
    },
    (records) => {
      delete records.tasks[0].isComplete;
    },
    (records) => {
      records.notes = null;
    },
  ];
  for (const corrupt of corruptions) {
    const records = structuredClone(valid);
    corrupt(records);
    const gateway = new FakeGateway(records);
    const broken = new LearnerProfile(gateway);
    assert.ok(broken.load().loadError);
    assert.throws(() => broken.submitTask("New", "2026-11-05"), /disabled/);
    assert.deepEqual(gateway.saved, records);
    assert.equal(gateway.writes, 0);
  }
});
