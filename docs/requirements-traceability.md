# Requirements traceability

The supplied prompt is the implementation baseline. The workspace was empty: there were no assignment documents, prior code, or competing versions to reconcile. FR identifiers below are preserved. The Pomodoro feature has no invented FR identifier.

Paths are relative to the project root.

| Requirement | Components / classes | Implementation locations | Automated evidence |
| --- | --- | --- | --- |
| FR-1 Add Task | BrainsScreens, BrainsController, LearnerWorkspace / LearnerProfile, TaskNoteModel / TaskList, Task | `BrainsScreens.openTaskForm`; `BrainsController.submit`; `LearnerProfile.submitTask` and `transact`; `TaskList.addTask`; Task constructor and `validation.js` | `tests/model.test.js`: required title, real date, past dates; `tests/workspace.test.js`: invalid submission unchanged/no write, zero/multiple tags, failed writes; `tests/browser/flows.spec.js`: task form validation and persistence |
| FR-2 Dashboard | BrainsScreens; LearnerProfile; TaskList, Task | `BrainsScreens.dashboard` / `taskRow`; `LearnerProfile.getSnapshot`; `TaskList.getTasksByDueDate`; `Task.isOverdue`; `validation.localDate` | `tests/model.test.js`: stable sorting, unchanged storage order, local date and overdue status; browser task flow, empty state, negative/positive UTC timezone display; performance test |
| FR-3 Complete Task | BrainsController; LearnerProfile; TaskList, Task; LocalStorageGateway | `BrainsController.completeTask`; `LearnerProfile.completeTask`; `TaskList.completeTask`; `Task.markComplete` / `markPending`; `BrainsScreens.updateTaskCompletion` | `tests/workspace.test.js`: complete/reload/pending/reload, failed writes; `tests/storage.test.js`: completion round trip; browser task completion/pending across reload |
| FR-4 Create and Apply Tags | LearnerProfile; Tag, Task, Note; BrainsScreens | `LearnerProfile.createTag`, `resolveTags`, `applyTags`, `reconstruct`; `Tag.normalizedName`; `Task.addTag`; `Note.addTag`; `BrainsScreens.tagPanel` / `tagOptions` / task tag form | Model shared identity/deduplicated attachments; workspace normalized duplicate rejection, shared reconstructed references, additive task/note tags; browser normalized duplicate and additive task tag tests |
| FR-5 Filter by Tags | BrainsController; LearnerProfile; TaskList, Task, Note | Controller per-view `filters`; `LearnerProfile.filterTasksByTag` / `filterNotesByTag`; `TaskList.filterByTag`; `matchingTags` in `TaskNoteModel/validation.js`; sidebar multi-select buttons with `aria-pressed` and OR help | Model and workspace multi-tag OR/zero-tags/unknown-tags checks; workspace asserts no persistence during filters; browser task/note multi-select and Clear, saved JSON unchanged |
| FR-6 Notes | BrainsScreens; BrainsController; LearnerProfile; Note | `BrainsScreens.notes` / `openNoteForm` / `showUnsaved`; controller draft tracking, close and unload handling, submit; `LearnerProfile.createNote` / `editNote`; `Note.edit` / `editContent` | Model required fields/edit timestamp; workspace edits/restoration and failed writes; browser unsaved indication, cancel/discard confirmation, explicit save, hostile markup as inert text, persisted edited note and tags |
| Planned Pomodoro feature (outside FR-1–FR-6) | BrainsScreens; BrainsController; LearnerProfile; StudyTimer / PomodoroTimer | `StudyTimer/PomodoroTimer.js`; workspace timer delegation; controller display ticker; `BrainsScreens.timer` / `updateTimer` | `tests/timer.test.js`: defaults, start/pause/resume/reset, boundaries, long delayed callbacks, missed cycles; browser fake-clock transitions and navigation |
| NFR-1 200 tasks within 2 seconds in at least 19/20 runs | All startup components; TaskList sorting; LocalStorageGateway single read | `src/main.js`; workspace load/reconstruct/getSnapshot; dashboard renderer | `tests/browser/performance.spec.js`: 20 fresh contexts, 200 actual DOM rows, exactly one storage read; raw measurements in `docs/performance-results.json`; environment limits in `docs/verification.md` |

Component paths in the table refer to their exact folder under `src/`, e.g. `src/LearnerWorkspace/LearnerProfile.js` and `src/BrainsScreens/BrainsScreens.js`.

## Cross-cutting reliability

- `tests/storage.test.js`: versioned round trip, malformed JSON/unsupported version untouched, unavailable property/read, quota failure preserving original JSON.
- `tests/workspace.test.js`: all write operations roll back memory on save failure; malformed relationships, duplicate IDs, missing fields, and impossible dates disable writing.
- `tests/architecture.test.js`: six folders, allowed imports, no import cycles.
- Browser checks: blocked localStorage, unreadable JSON, quota error retaining draft/dashboard; phone-width overflow, keyboard skip link; no external asset requests; dates in America/Los_Angeles and Pacific/Auckland.

Automated coverage is evidence for implemented behavior, not a claim of team review, full accessibility conformance, or verification on an unidentified course test laptop.
