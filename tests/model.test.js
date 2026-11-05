import { test } from "node:test";
import assert from "node:assert/strict";
import { Task } from "../src/TaskNoteModel/Task.js";
import { TaskList } from "../src/TaskNoteModel/TaskList.js";
import { Note } from "../src/TaskNoteModel/Note.js";
import { Tag } from "../src/TaskNoteModel/Tag.js";
import { localDate } from "../src/TaskNoteModel/validation.js";

test("tasks require a nonblank title and real calendar date, and accept past dates", () => {
  for (const title of ["", "   ", null])
    assert.throws(() => new Task(title, "2026-11-05"), /title/i);
  for (const date of [
    "",
    "tomorrow",
    "2026-02-30",
    "2025-02-29",
    "2026-13-01",
    null,
  ]) {
    assert.throws(() => new Task("Read", date), /due date/i);
  }
  assert.equal(new Task(" Read ", "2024-02-29").title, "Read");
  assert.equal(
    new Task("Old assignment", "2000-01-01").isOverdue("2026-11-05"),
    true,
  );
});

test("due dates stay as calendar strings and local date does not use UTC conversion", () => {
  const task = new Task("Deadline", "2026-11-05");
  assert.equal(task.toRecord().dueDate, "2026-11-05");
  // Explicit local components, independent of the machine timezone.
  assert.equal(localDate(new Date(2026, 10, 5, 23, 59)), "2026-11-05");
  assert.equal(task.isOverdue("2026-11-05"), false);
  assert.equal(task.isOverdue("2026-11-06"), true);
  task.markComplete();
  assert.equal(task.isOverdue("2026-11-06"), false);
});

test("sorting is earliest first with insertion order for equal dates, without mutating storage order", () => {
  const list = new TaskList();
  list.addTask("Later", "2026-12-01");
  list.addTask("First tie", "2026-11-01");
  list.addTask("Second tie", "2026-11-01");
  assert.deepEqual(
    list.getTasksByDueDate().map((task) => task.title),
    ["First tie", "Second tie", "Later"],
  );
  assert.equal(list.tasks[0].title, "Later");
});

test("tags share identity, deduplicate attachments, and OR filters support many or zero tags", () => {
  const university = new Tag("University");
  const certification = new Tag("Certification");
  const list = new TaskList();
  const task = list.addTask("Read", "2026-11-05");
  task.addTag(university);
  task.addTag(certification);
  task.addTag(university);
  list.addTask("No tags", "2026-11-06");
  assert.equal(task.tags.length, 2);
  assert.equal(task.tags[0], university);
  assert.equal(list.filterByTag([university, certification]).length, 1);
  assert.equal(list.filterByTag([certification.id]).length, 1);
  assert.equal(list.filterByTag([]).length, 2);
  assert.equal(list.filterByTag(["other"]).length, 0);
});

test("notes validate their fields, edit content explicitly, and update lastEdited", () => {
  for (const args of [
    [" ", "Course", "Content"],
    ["Title", "", "Content"],
    ["Title", "Course", " "],
  ]) {
    assert.throws(() => new Note(...args), /required/);
  }
  const note = new Note("Lecture", "CS 2450", "Original", {
    lastEdited: "2026-11-01T12:00:00.000Z",
  });
  note.editContent("Edited", "2026-11-05T12:00:00.000Z");
  assert.equal(note.content, "Edited");
  assert.equal(note.lastEdited, "2026-11-05T12:00:00.000Z");
  assert.throws(() => note.edit(" ", "Course", "Wrong"), /required/);
  assert.equal(note.content, "Edited");
});
