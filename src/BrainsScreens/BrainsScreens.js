const icons = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  notes:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  timer:
    '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3M18 5l2-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  leaf: '<path d="M20 4C10 2 3 7 5 15s15 5 15-11Z"/><path d="m4 21 11-11"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.notes}</svg>`;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const taskDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const formatDate = (value) => taskDateFormatter.format(new Date(`${value}T12:00:00`));

export class BrainsScreens {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <aside class="sidebar" aria-label="Workspace navigation">
        <a class="brand" href="#dashboard" data-action="navigate" data-id="dashboard"><span class="brand-mark">b<span>·</span></span> brains<span class="brand-period">.</span></a>
        <div class="workspace-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Main navigation">
          <button data-action="navigate" data-id="dashboard">${icon("dashboard")}Dashboard</button>
          <button data-action="navigate" data-id="notes">${icon("notes")}Notes<span class="nav-count" id="note-count">0</span></button>
          <button data-action="navigate" data-id="timer">${icon("timer")}Timer</button>
        </nav>
        <div id="tag-panel"></div>
        <div class="sidebar-bottom"><div class="local-icon">${icon("lock")}</div><div><strong>Just you. Just here.</strong><p>Saved in this browser.<br>No account needed.</p></div></div>
        <div class="course-credit">A little space for a lot of learning.</div>
      </aside>
      <div class="workspace">
        <header class="topbar"><span>Personal workspace <span class="topbar-slash">/</span> <strong id="breadcrumb">Dashboard</strong></span><span class="local-badge"><span></span> Local & private</span></header>
        <div id="storage-error" class="storage-error" role="alert" hidden></div>
        <main id="main" tabindex="-1"></main>
        <footer class="workspace-footer"><span>Make room for what you’re learning.</span><span>Brains · CS 2450</span></footer>
      </div>
      <div id="feedback" class="feedback" role="status" aria-live="polite" aria-atomic="true"></div>
      <dialog id="entry-dialog" aria-labelledby="dialog-title"></dialog>`;
    this.dialog = this.root.querySelector("#entry-dialog");
  }
  connect(controller) {
    this.root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || button.disabled) return;
      event.preventDefault();
      controller.handleAction(button.dataset.action, button.dataset.id);
    });
    this.root.addEventListener("submit", (event) => {
      event.preventDefault();
      controller.submit(event.target);
    });
    this.root.addEventListener("change", (event) => {
      if (event.target.matches("[data-complete]"))
        controller.completeTask(
          event.target.dataset.complete,
          event.target.checked,
        );
      else controller.draftChanged(event.target.closest("form"));
    });
    this.root.addEventListener("input", (event) =>
      controller.draftChanged(event.target.closest("form")),
    );
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      controller.closeForm();
    });
  }
  render(snapshot, route, filters) {
    this.snapshot = snapshot;
    this.root.querySelectorAll("nav [data-id]").forEach((button) => {
      button.classList.toggle("active", button.dataset.id === route);
      if (button.dataset.id === route)
        button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    this.root.querySelector("#breadcrumb").textContent = {
      dashboard: "Dashboard",
      notes: "Notes",
      timer: "Timer",
    }[route];
    this.root.querySelector("#note-count").textContent = snapshot.counts.notes;
    const warning = this.root.querySelector("#storage-error");
    warning.hidden = !snapshot.loadError;
    warning.textContent = snapshot.loadError;
    const tagPanel = this.root.querySelector("#tag-panel");
    const tagDraft = tagPanel.querySelector("#tag-name")?.value ?? "";
    tagPanel.innerHTML = this.tagPanel(snapshot, route, filters);
    tagPanel.querySelector("#tag-name").value = tagDraft;
    this.root.querySelector("#main").innerHTML =
      route === "dashboard"
        ? this.dashboard(snapshot, filters)
        : route === "notes"
          ? this.notes(snapshot, filters)
          : this.timer();
    this.updateTimer(snapshot.timer);
  }
  tagPanel(snapshot, route, filters) {
    const disabled = snapshot.loadError ? "disabled" : "";
    return `<section class="tag-section" aria-labelledby="tags-title"><div class="section-label"><h2 id="tags-title">YOUR TAGS</h2>${route !== "timer" && filters.length ? '<button class="text-button" data-action="clear-filters">Clear</button>' : ""}</div>
      <p class="tag-help">${route === "timer" ? "Shared across tasks and notes." : "Select tags to filter. Matches any selected tag."}</p>
      <div class="filter-tags">${snapshot.tags.length ? snapshot.tags.map((tag, index) => `<button class="filter-tag ${filters.includes(tag.id) ? "selected" : ""}" data-action="filter-tag" data-id="${escape(tag.id)}" aria-pressed="${filters.includes(tag.id)}" ${route === "timer" ? "disabled" : ""}><span class="tag-dot tone-${index % 5}"></span>${escape(tag.name)}${filters.includes(tag.id) ? `<span class="filter-check">${icon("check")}</span>` : ""}</button>`).join("") : '<p class="muted small">No tags yet. Make one your own.</p>'}</div>
      <form id="tag-form" novalidate><label for="tag-name" class="small">Create a reusable tag</label><div class="tag-input-row"><input id="tag-name" name="name" placeholder="e.g. Cybersecurity" maxlength="40" required ${disabled} aria-describedby="tag-error"><button class="icon-button" aria-label="Create tag" ${disabled}>${icon("plus")}</button></div><p id="tag-error" class="form-error" role="alert"></p></form></section>`;
  }
  heading(eyebrow, title, description, action = "") {
    return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p class="page-description">${description}</p></div>${action}</div>`;
  }
  addButton(kind, disabled) {
    return `<button class="button primary" data-action="add-${kind}" ${disabled ? "disabled" : ""}>${icon("plus")}Add ${kind}</button>`;
  }
  chips(tagIds) {
    return tagIds
      .map((id) => {
        const index = this.snapshot.tags.findIndex((tag) => tag.id === id);
        return `<span class="tag-chip tone-${index % 5}">${escape(this.snapshot.tags[index].name)}</span>`;
      })
      .join("");
  }
  dashboard(snapshot, filters) {
    const date = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(`${snapshot.today}T12:00:00`));
    return `${this.heading(escape(date).toUpperCase(), "A little more organized.<br>A lot more headspace.", "Your classes, courses, and next steps. All together.", this.addButton("task", snapshot.loadError))}
      <section class="stats" aria-label="Task overview">
        <div class="stat"><span>Still to do</span><strong><span data-count="pending">${snapshot.counts.pending}</span><small>pending tasks</small></strong><span class="stat-symbol">↗</span></div>
        <div class="stat"><span>Needs a little attention</span><strong><span data-count="overdue">${snapshot.counts.overdue}</span><small>overdue tasks</small></strong><span class="stat-symbol warm">◷</span></div>
        <div class="stat"><span>One step at a time</span><strong><span data-count="complete">${snapshot.counts.complete}</span><small>completed tasks</small></strong><span class="stat-symbol">${icon("check")}</span></div>
      </section>
      <section class="task-section" aria-labelledby="task-list-title"><div class="list-heading"><div><h2 id="task-list-title">Your tasks <span class="count">${snapshot.tasks.length}</span></h2><p>${filters.length ? "Showing tasks with any selected tag." : "Everything you’re working toward, in due-date order."}</p></div><span class="sort-label">Earliest due first ↓</span></div>
        ${snapshot.tasks.length ? `<div class="task-list">${snapshot.tasks.map((task) => this.taskRow(task, snapshot)).join("")}</div>` : this.empty(filters.length ? "Nothing with these tags. Yet." : "Your next step starts here.", filters.length ? "Try another tag, or clear the filters to see every task." : "Add your first assignment, course deadline, or personal goal. We’ll keep them together.", filters.length ? '<button class="button secondary" data-action="clear-filters">Clear filters</button>' : this.addButton("task", snapshot.loadError), "leaf")}
      </section>
      <div class="focus-strip"><span class="focus-icon">${icon("timer")}</span><div><strong>A little focus goes a long way.</strong><p>Make space for one thing with a 25-minute study session.</p></div><button class="text-button" data-action="navigate" data-id="timer">Open timer ${icon("arrow")}</button></div>`;
  }
  taskRow(task, snapshot) {
    const disabled = snapshot.loadError ? "disabled" : "";
    const availableTags = snapshot.tags.filter((tag) => !task.tagIds.includes(tag.id));
    const newTagId = `task-new-tag-${task.id}`;
    const state = task.isComplete
      ? "Completed"
      : task.isOverdue
        ? "Overdue"
        : task.dueDate === snapshot.today
          ? "Due today"
          : "Pending";
    return `<article class="task-row ${task.isComplete ? "is-complete" : ""}" data-task-id="${escape(task.id)}"><div class="task-row-main">
      <input type="checkbox" class="task-checkbox" data-complete="${escape(task.id)}" aria-label="Mark ${escape(task.title)} ${task.isComplete ? "pending" : "complete"}" ${task.isComplete ? "checked" : ""} ${disabled}>
      <div class="task-copy"><h3>${escape(task.title)}</h3>${task.description ? `<p class="task-description">${escape(task.description)}</p>` : ""}<div class="item-tags">${this.chips(task.tagIds)}</div></div>
      <div class="task-date"><time datetime="${escape(task.dueDate)}">${formatDate(task.dueDate)}</time><span class="status ${task.isComplete ? "complete" : task.isOverdue ? "overdue" : ""}">${state}</span><button class="text-button task-edit" data-action="edit-task" data-id="${escape(task.id)}" aria-label="Edit task: ${escape(task.title)}" ${disabled}>Edit</button></div></div>
      <details class="task-tag-editor"><summary>Add tags</summary><form data-kind="task-tags" data-id="${escape(task.id)}" novalidate>
      ${availableTags.length ? this.tagOptions(availableTags, [], `task-${task.id}`) : ""}${this.newTagField(newTagId, disabled)}<p id="tags-error-${escape(task.id)}" class="form-error" role="alert"></p><button type="submit" class="button secondary small-button" ${disabled}>Save tags</button></form></details></article>`;
  }
  updateTaskCompletion(snapshot, id) {
    this.snapshot = snapshot;
    const task = snapshot.tasks.find((item) => item.id === id);
    const row = this.root.querySelector(`[data-task-id="${CSS.escape(id)}"]`);
    if (!task || !row) return;
    row.classList.toggle("is-complete", task.isComplete);
    const checkbox = row.querySelector("[data-complete]");
    checkbox.checked = task.isComplete;
    checkbox.setAttribute(
      "aria-label",
      `Mark ${task.title} ${task.isComplete ? "pending" : "complete"}`,
    );
    const status = row.querySelector(".status");
    status.textContent = task.isComplete
      ? "Completed"
      : task.isOverdue
        ? "Overdue"
        : task.dueDate === snapshot.today
          ? "Due today"
          : "Pending";
    status.className = `status ${task.isComplete ? "complete" : task.isOverdue ? "overdue" : ""}`;
    this.root.querySelectorAll("[data-count]").forEach((element) => {
      element.textContent = snapshot.counts[element.dataset.count];
    });
  }
  empty(title, description, action, symbol = "notes") {
    return `<div class="empty-state"><div class="empty-symbol">${icon(symbol)}</div><h3>${title}</h3><p>${description}</p>${action}</div>`;
  }
  notes(snapshot, filters) {
    return `${this.heading("THOUGHTS, WORTH KEEPING", "A home for your<br>next bright idea.", "Lecture notes, course takeaways, and things to remember.", this.addButton("note", snapshot.loadError))}
      <div class="list-heading"><div><h2>Your notes <span class="count">${snapshot.notes.length}</span></h2><p>${filters.length ? "Showing notes with any selected tag." : "Keep the context. Come back to it whenever you need."}</p></div><span class="sort-label">Explicit save · stored locally</span></div>
      ${snapshot.notes.length ? `<section class="notes-grid" aria-label="Saved notes">${snapshot.notes.map((note) => `<article class="note-card"><div class="note-course">${icon("notes")}${escape(note.courseName)}</div><h2>${escape(note.title)}</h2><p class="note-excerpt">${escape(note.content)}</p><div class="item-tags">${this.chips(note.tagIds)}</div><div class="note-footer"><span>Edited ${escape(new Date(note.lastEdited).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</span><button class="text-button" data-action="edit-note" data-id="${escape(note.id)}" aria-label="Edit ${escape(note.title)}">Open note ${icon("arrow")}</button></div></article>`).join("")}</section>` : this.empty(filters.length ? "No notes match these tags." : "Good thoughts deserve a place.", filters.length ? "Clear the filters to return to all your notes." : "Save a lecture, a useful explanation, or a takeaway from any course.", filters.length ? '<button class="button secondary" data-action="clear-filters">Clear filters</button>' : this.addButton("note", snapshot.loadError))}`;
  }
  timer() {
    return `${this.heading("ONE THING AT A TIME", "Find your focus.", "Small sessions. Real progress. Give the next 25 minutes a purpose.")}
      <section class="timer-layout"><div class="timer-card"><span id="timer-mode" class="timer-mode">Work session</span><div id="timer-ring" class="timer-ring"><div><span id="timer-time" class="timer-time" role="timer" aria-label="Time remaining">25:00</span><span id="timer-status">Ready when you are</span></div></div><div class="timer-controls"><button id="timer-toggle" class="button primary" data-action="start-timer">Start focus session</button><button class="button secondary" data-action="reset-timer">Reset</button></div><p id="timer-transition" class="small muted" aria-live="polite">25 minutes of work, then a 5-minute break.</p></div>
      <aside class="timer-guide"><span class="eyebrow">THE POMODORO RHYTHM</span><h2>A simple way<br>to get going.</h2><ol><li><strong>Pick one thing.</strong><p>An assignment, a chapter, or a small next step.</p></li><li><strong>Give it 25 minutes.</strong><p>Start the timer and let the rest wait.</p></li><li><strong>Take five.</strong><p>Stretch, grab some water, and come back fresh.</p></li></ol><div class="timer-tip">${icon("leaf")}<p>Breaks start automatically. Pause whenever you need. Keep this tab open; reloading resets the timer.</p></div></aside></section>`;
  }
  updateTimer(state) {
    const time = this.root.querySelector("#timer-time");
    if (!time) return;
    const seconds = Math.ceil(state.remainingMs / 1000);
    const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    if (time.textContent !== timeLabel) time.textContent = timeLabel;
    const mode = state.mode === "work" ? "Work session" : "Break time";
    const modeElement = this.root.querySelector("#timer-mode");
    const transition = this.root.querySelector("#timer-transition");
    const isReady = !state.isRunning && state.mode === "work" && state.remainingMs === state.durationMs;
    if (modeElement.textContent !== mode) {
      modeElement.textContent = mode;
      transition.textContent =
        state.mode === "break"
          ? "Work session finished. Take a 5-minute break."
          : "Break finished. Your next work session has begun.";
    }
    const defaultHelp = "25 minutes of work, then a 5-minute break.";
    if (isReady && transition.textContent !== defaultHelp) {
      transition.textContent = defaultHelp;
    }
    const status = this.root.querySelector("#timer-status");
    const statusLabel = state.isRunning
      ? state.mode === "work"
        ? "One thing at a time"
        : "A moment to recharge"
      : isReady
        ? "Ready when you are"
        : "Paused · take your time";
    if (status.textContent !== statusLabel) status.textContent = statusLabel;
    const toggle = this.root.querySelector("#timer-toggle");
    const label = state.isRunning
      ? "Pause timer"
      : isReady
        ? "Start focus session"
        : "Resume timer";
    if (toggle.textContent !== label) toggle.textContent = label;
    toggle.dataset.action = state.isRunning ? "pause-timer" : "start-timer";
    this.root
      .querySelector("#timer-ring")
      .style.setProperty(
        "--progress",
        `${100 * (1 - state.remainingMs / state.durationMs)}%`,
      );
  }
  tagOptions(tags, selected, prefix) {
    if (!tags.length) return "";
    return `<fieldset class="tag-options"><legend>Tags <span class="muted">(optional)</span></legend>${tags.map((tag) => `<label class="tag-choice" for="${escape(prefix)}-${escape(tag.id)}"><input id="${escape(prefix)}-${escape(tag.id)}" type="checkbox" name="tagIds" value="${escape(tag.id)}" ${selected.includes(tag.id) ? "checked" : ""}>${escape(tag.name)}</label>`).join("")}</fieldset>`;
  }
  formHeader(title, description) {
    return `<div class="dialog-heading"><div><p class="eyebrow">YOUR LEARNING WORKSPACE</p><h2 id="dialog-title">${title}</h2></div><button type="button" class="close-button" data-action="close-form" aria-label="Close form">×</button></div><p class="muted">${description}</p>`;
  }
  newTagField(id, disabled = "") {
    return `<label for="${escape(id)}">New tag name <span class="muted">(optional)</span></label><input id="${escape(id)}" name="newTagName" maxlength="40" ${disabled}>`;
  }
  openTaskForm(snapshot, id) {
    const task = snapshot.tasks.find((item) => item.id === id);
    this.dialog.innerHTML = `${this.formHeader(task ? "Edit task" : "Add task", task ? "Update the task title, due date, or description." : "Set a due date and add any tags you want to use.")}<form id="task-form" ${task ? `data-id="${escape(task.id)}"` : ""} novalidate>
      <label for="task-title">Task title <span class="required">*</span></label><input id="task-title" name="title" maxlength="200" required value="${escape(task?.title ?? "")}" placeholder="What’s your next step?" aria-describedby="form-error">
      <label for="task-due">Due date <span class="required">*</span></label><input id="task-due" name="dueDate" type="date" required value="${escape(task?.dueDate ?? "")}" aria-describedby="form-error">
      <label for="task-description">Description <span class="muted">(optional)</span></label><textarea id="task-description" name="description" rows="3" maxlength="100000" placeholder="A little context for future you"></textarea>
      ${!task && snapshot.tags.length ? this.tagOptions(snapshot.tags, [], "new-task") : ""}${task ? "" : this.newTagField("new-task-tag")}<p id="form-error" class="form-error" role="alert"></p><div class="dialog-footer"><span id="draft-state" class="draft-state">${task ? "All changes saved" : "Not saved yet"}</span><button type="button" class="button secondary" data-action="close-form">Cancel</button><button class="button primary" ${snapshot.loadError ? "disabled" : ""}>Save task</button></div></form>`;
    this.dialog.querySelector("#task-description").value = task?.description ?? "";
    this.dialog.showModal();
    this.dialog.querySelector("#task-title").focus();
  }
  openNoteForm(snapshot, id) {
    const note = snapshot.notes.find((item) => item.id === id);
    this.dialog.innerHTML = `${this.formHeader(note ? "Back to your notes." : "Keep a good thought.", "Your changes stay in this form until you choose Save.")}<form id="note-form" ${note ? `data-id="${escape(note.id)}"` : ""} novalidate>
      <label for="note-title">Note title <span class="required">*</span></label><input id="note-title" name="title" maxlength="200" required value="${escape(note?.title ?? "")}" placeholder="Give this thought a title" aria-describedby="form-error">
      <label for="note-course">Course or lecture <span class="required">*</span></label><input id="note-course" name="courseName" maxlength="200" required value="${escape(note?.courseName ?? "")}" placeholder="e.g. CS 2450 · Layered architecture" aria-describedby="form-error">
      <label for="note-content">Content <span class="required">*</span></label><textarea id="note-content" name="content" rows="7" maxlength="100000" required placeholder="What would you like to remember?" aria-describedby="form-error"></textarea>
      ${this.tagOptions(snapshot.tags, note?.tagIds ?? [], "note")}${this.newTagField("new-note-tag")}
      <p id="form-error" class="form-error" role="alert"></p><div class="dialog-footer"><span id="draft-state" class="draft-state">${note ? "All changes saved" : "Not saved yet"}</span><button type="button" class="button secondary" data-action="close-form">Cancel</button><button class="button primary" ${snapshot.loadError ? "disabled" : ""}>Save note</button></div></form>`;
    this.dialog.querySelector("#note-content").value = note?.content ?? "";
    this.dialog.showModal();
    this.dialog.querySelector("#note-title").focus();
  }
  closeForm() {
    this.dialog.close();
  }
  showUnsaved() {
    const indicator = this.dialog.querySelector("#draft-state");
    if (indicator) {
      indicator.textContent = "Unsaved changes";
      indicator.classList.add("unsaved");
    }
  }
  clearError(id) {
    const element = this.root.querySelector(`#${CSS.escape(id)}`);
    if (element) element.textContent = "";
  }
  showError(id, message) {
    const element = this.root.querySelector(`#${CSS.escape(id)}`);
    if (element) element.textContent = message;
    else this.feedback(message, true);
  }
  feedback(message, error = false) {
    const element = this.root.querySelector("#feedback");
    element.textContent = message;
    element.classList.toggle("error", error);
    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(
      () => {
        element.textContent = "";
      },
      error ? 12000 : 4500,
    );
  }
  focusHeading() {
    this.root.querySelector("h1").focus();
  }
  focusAfterSave(form) {
    if (form.id === "tag-form") {
      this.root.querySelector("#tag-name").focus();
    } else if (form.dataset.kind === "task-tags") {
      const row = this.root.querySelector(`[data-task-id="${CSS.escape(form.dataset.id)}"]`);
      const target = row?.querySelector("summary") ?? row?.querySelector("[data-complete]");
      target?.focus();
    } else if (form.dataset.id) {
      const action = form.id === "task-form" ? "edit-task" : "edit-note";
      const button = this.root.querySelector(`[data-action="${action}"][data-id="${CSS.escape(form.dataset.id)}"]`);
      if (button) button.focus();
      else this.focusHeading();
    } else {
      this.root
        .querySelector(
          `[data-action="add-${form.id === "task-form" ? "task" : "note"}"]`,
        )
        ?.focus();
    }
  }
  focusFilter(id) {
    this.root
      .querySelector(`.filter-tag[data-id="${CSS.escape(id)}"]`)
      ?.focus();
  }
  focusTask(id) {
    this.root.querySelector(`[data-complete="${CSS.escape(id)}"]`)?.focus();
  }
}
