export class BrainsController {
  constructor(workspace, screens) {
    this.workspace = workspace;
    this.screens = screens;
    this.route = "dashboard";
    this.filters = { dashboard: [], notes: [] };
    this.dirty = false;
  }
  start() {
    this.workspace.load();
    this.screens.connect(this);
    this.render();
    this.ticker = setInterval(
      () => this.screens.updateTimer(this.workspace.getTimerState()),
      250,
    );
    this.beforeUnload = (event) => {
      if (this.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", this.beforeUnload);
  }
  destroy() {
    clearInterval(this.ticker);
    window.removeEventListener("beforeunload", this.beforeUnload);
  }
  snapshot() {
    return this.workspace.getSnapshot(
      this.filters.dashboard,
      this.filters.notes,
    );
  }
  render() {
    this.screens.render(
      this.snapshot(),
      this.route,
      this.filters[this.route] ?? [],
    );
  }
  handleAction(action, id) {
    if (action === "navigate") {
      this.route = id;
      this.render();
      this.screens.focusHeading();
    } else if (action === "add-task") {
      this.dirty = false;
      this.screens.openTaskForm(this.snapshot());
    } else if (action === "add-note" || action === "edit-note") {
      this.dirty = false;
      this.screens.openNoteForm(this.snapshot(), id);
    } else if (action === "close-form") {
      this.closeForm();
    } else if (action === "clear-filters") {
      this.filters[this.route] = [];
      this.render();
      this.screens.focusHeading();
    } else if (action === "filter-tag") {
      const filters = this.filters[this.route];
      if (!filters) return;
      this.filters[this.route] = filters.includes(id)
        ? filters.filter((tag) => tag !== id)
        : [...filters, id];
      this.render();
      this.screens.focusFilter(id);
    } else if (["start-timer", "pause-timer", "reset-timer"].includes(action)) {
      const method = {
        "start-timer": "startTimer",
        "pause-timer": "pauseTimer",
        "reset-timer": "resetTimer",
      }[action];
      const state = this.workspace[method]();
      this.screens.updateTimer(state);
      this.screens.feedback(
        action === "reset-timer"
          ? "Timer reset to a fresh work session."
          : state.isRunning
            ? "Timer started."
            : "Timer paused.",
      );
    }
  }
  closeForm() {
    if (this.dirty && !window.confirm("Discard your unsaved changes?")) return;
    this.dirty = false;
    this.screens.closeForm();
  }
  draftChanged(form) {
    if (["task-form", "note-form"].includes(form?.id)) {
      this.dirty = true;
      this.screens.showUnsaved();
    }
  }
  completeTask(id, complete) {
    try {
      this.workspace.completeTask(id, complete);
      this.screens.updateTaskCompletion(this.snapshot(), id);
      this.screens.focusTask(id);
      this.screens.feedback(
        complete ? "Task completed. Nicely done." : "Task returned to pending.",
      );
    } catch (error) {
      this.screens.updateTaskCompletion(this.snapshot(), id);
      this.screens.feedback(error.message, true);
    }
  }
  submit(form) {
    this.screens.feedback("");
    const data = new FormData(form);
    const text = (name) => String(data.get(name) ?? "");
    const tags = data.getAll("tagIds").map(String);
    const errorTarget =
      form.id === "tag-form"
        ? "tag-error"
        : form.dataset.kind === "task-tags"
          ? `tags-error-${form.dataset.id}`
          : "form-error";
    this.screens.clearError(errorTarget);
    try {
      if (form.id === "task-form") {
        this.workspace.submitTask(
          text("title"),
          text("dueDate"),
          text("description"),
          tags,
        );
      } else if (form.id === "note-form") {
        const args = [text("title"), text("courseName"), text("content"), tags];
        if (form.dataset.id) this.workspace.editNote(form.dataset.id, ...args);
        else this.workspace.createNote(...args);
      } else if (form.id === "tag-form") {
        this.workspace.createTag(text("name"));
      } else if (form.dataset.kind === "task-tags") {
        this.workspace.applyTags("task", form.dataset.id, tags);
      } else return;
      if (["task-form", "note-form"].includes(form.id)) {
        this.dirty = false;
        this.screens.closeForm();
      }
      this.render();
      this.screens.focusAfterSave(form);
      this.screens.feedback(
        form.id === "tag-form"
          ? "Tag created. Use it on tasks and notes."
          : "Saved on this device.",
      );
    } catch (error) {
      this.screens.showError(errorTarget, error.message);
    }
  }
}
