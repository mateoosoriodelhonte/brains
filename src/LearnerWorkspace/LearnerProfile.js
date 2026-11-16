import { Task } from "../TaskNoteModel/Task.js";
import { TaskList } from "../TaskNoteModel/TaskList.js";
import { Tag } from "../TaskNoteModel/Tag.js";
import { Note } from "../TaskNoteModel/Note.js";
import { localDate, requiredText } from "../TaskNoteModel/validation.js";
import { PomodoroTimer } from "../StudyTimer/PomodoroTimer.js";

const emptyRecords = () => ({
  name: "Learner",
  tasks: [],
  notes: [],
  tags: [],
});

export class LearnerProfile {
  constructor(
    gateway,
    { timer = new PomodoroTimer(), clock = () => new Date() } = {},
  ) {
    this.gateway = gateway;
    this.timer = timer;
    this.clock = clock;
    this.state = this.reconstruct(emptyRecords());
    this.loadError = "";
  }
  get name() {
    return this.state.name;
  }
  load() {
    try {
      const records = this.gateway.load();
      this.state = this.reconstruct(records ?? emptyRecords());
      this.loadError = "";
    } catch (error) {
      this.loadError = `${error.message} No saved records have been replaced.`;
    }
    return this.getSnapshot();
  }
  reconstruct(records) {
    if (
      !records ||
      !["tasks", "notes", "tags"].every((key) => Array.isArray(records[key]))
    ) {
      throw new Error(
        "Saved workspace records are invalid. Saving is disabled.",
      );
    }
    const ids = new Set();
    const unique = (record) => {
      if (
        !record ||
        typeof record.id !== "string" ||
        !record.id.trim() ||
        ids.has(record.id)
      ) {
        throw new Error(
          "Saved record identifiers are invalid. Saving is disabled.",
        );
      }
      ids.add(record.id);
      return record;
    };
    const tags = records.tags.map((record) => {
      unique(record);
      return new Tag(record.name, record.id);
    });
    if (new Set(tags.map((tag) => tag.normalizedName)).size !== tags.length) {
      throw new Error("Saved tags contain duplicates. Saving is disabled.");
    }
    const resolveTags = (record) => {
      if (
        !Array.isArray(record.tagIds) ||
        new Set(record.tagIds).size !== record.tagIds.length
      ) {
        throw new Error(
          "Saved tag relationships are invalid. Saving is disabled.",
        );
      }
      return record.tagIds.map((id) => {
        const tag = tags.find((item) => item.id === id);
        if (!tag)
          throw new Error("A saved tag is missing. Saving is disabled.");
        return tag;
      });
    };
    const tasks = records.tasks.map((record) => {
      unique(record);
      if (
        typeof record.isComplete !== "boolean" ||
        typeof record.description !== "string"
      ) {
        throw new Error("Saved task fields are invalid. Saving is disabled.");
      }
      return new Task(record.title, record.dueDate, record.description, {
        ...record,
        tags: resolveTags(record),
      });
    });
    const notes = records.notes.map((record) => {
      unique(record);
      if (typeof record.lastEdited !== "string")
        throw new Error("Saved note date is missing. Saving is disabled.");
      return new Note(record.title, record.courseName, record.content, {
        ...record,
        tags: resolveTags(record),
      });
    });
    return {
      name: requiredText(records.name, "Learner name"),
      tags,
      taskList: new TaskList(tasks),
      notes,
    };
  }
  records(state = this.state) {
    return {
      name: state.name,
      tags: state.tags.map((tag) => tag.toRecord()),
      tasks: state.taskList.tasks.map((task) => task.toRecord()),
      notes: state.notes.map((note) => note.toRecord()),
    };
  }
  transact(change) {
    if (this.loadError)
      throw new Error(
        "Saving is disabled because saved data could not be loaded. Resolve the storage issue and reload.",
      );
    // A candidate is private until validation AND the single atomic storage write succeed.
    const candidate = this.reconstruct(this.records());
    const result = change(candidate);
    this.gateway.save(this.records(candidate));
    this.state = candidate;
    return result;
  }
  resolveTags(state, tagIds) {
    if (!Array.isArray(tagIds)) throw new Error("Select valid tags.");
    return [...new Set(tagIds)].map((id) => {
      const tag = state.tags.find((item) => item.id === id);
      if (!tag) throw new Error("One of the selected tags no longer exists.");
      return tag;
    });
  }
  submitTask(title, dueDate, description = "", tagIds = []) {
    return this.transact((state) =>
      state.taskList.addTask(title, dueDate, description, {
        tags: this.resolveTags(state, tagIds),
      }),
    );
  }
  completeTask(task, isComplete = true) {
    if (typeof isComplete !== "boolean")
      throw new Error("Invalid completion status.");
    return this.transact((state) =>
      state.taskList.completeTask(task, isComplete),
    );
  }
  createTag(name) {
    return this.transact((state) => {
      const tag = new Tag(name);
      if (
        state.tags.some(
          (existing) => existing.normalizedName === tag.normalizedName,
        )
      )
        throw new Error("A tag with this name already exists.");
      state.tags.push(tag);
      return tag;
    });
  }
  createNote(title, courseName, content, tagIds = []) {
    return this.transact((state) => {
      const note = new Note(title, courseName, content, {
        tags: this.resolveTags(state, tagIds),
        lastEdited: this.clock().toISOString(),
      });
      state.notes.push(note);
      return note;
    });
  }
  editNote(id, title, courseName, content, tagIds = []) {
    return this.transact((state) => {
      const note = state.notes.find((item) => item.id === id);
      if (!note) throw new Error("This note could not be found.");
      const tags = this.resolveTags(state, tagIds);
      note.edit(title, courseName, content, this.clock().toISOString());
      note.tags = tags;
      return note;
    });
  }
  applyTags(kind, id, tagIds) {
    return this.transact((state) => {
      const item =
        kind === "task"
          ? state.taskList.findTask(id)
          : state.notes.find((note) => note.id === id);
      if (!item || !["task", "note"].includes(kind))
        throw new Error("This item could not be found.");
      this.resolveTags(state, tagIds).forEach((tag) => item.addTag(tag));
      return item;
    });
  }
  filterTasksByTag(tags = []) {
    return this.state.taskList.filterByTag(tags);
  }
  filterNotesByTag(tags = []) {
    return this.state.notes.filter((note) => note.matchesTags(tags));
  }
  startTimer() {
    this.timer.start();
    return this.timer.getState();
  }
  pauseTimer() {
    this.timer.pause();
    return this.timer.getState();
  }
  resetTimer() {
    this.timer.reset();
    return this.timer.getState();
  }
  getTimerState() {
    return this.timer.getState();
  }
  getSnapshot(taskTags = [], noteTags = []) {
    const today = localDate(this.clock());
    const tasks = this.state.taskList.getTasksByDueDate();
    const visibleTasks = [];
    let complete = 0;
    let overdue = 0;
    for (const task of tasks) {
      const isOverdue = task.isOverdue(today);
      if (task.isComplete) complete++;
      if (isOverdue) overdue++;
      if (taskTags.length === 0 || task.matchesTags(taskTags)) {
        visibleTasks.push({ ...task.toRecord(), isOverdue });
      }
    }
    return {
      name: this.name,
      today,
      loadError: this.loadError,
      tags: this.state.tags.map((tag) => tag.toRecord()),
      tasks: visibleTasks,
      notes: this.filterNotesByTag(noteTags).map((note) => note.toRecord()),
      counts: {
        total: tasks.length,
        pending: tasks.length - complete,
        overdue,
        complete,
        notes: this.state.notes.length,
      },
      timer: this.getTimerState(),
    };
  }
}
