# Design changes and assumptions

The six supplied component names and class ownership remain intact. This record explains additions needed to turn the supplied class model into a working local app.

| Addition or change | Reason |
| --- | --- |
| Stable `id` on Task, Note, and Tag, normally created with `crypto.randomUUID()` | Persist identity independently of names and object references. No separate duplicate domain classes. |
| `toRecord()` on Task, Note, and Tag; workspace `records()` / `reconstruct()` | Keep persistent plain records separate from domain objects; reconstruct shared tags in the application, never the gateway. |
| Task/Note hold shared Tag objects; records contain `tagIds` | Reusable identity survives saves and reloads. Within one valid state, every matching ID resolves to the same Tag instance. |
| TaskList constructor, `findTask`, optional fourth `options` argument on `addTask` | Restore existing tasks and attach IDs/tags atomically at creation. Original three arguments remain usable. |
| `Task.markPending()`; optional `isComplete` argument on `TaskList.completeTask` / `LearnerProfile.completeTask`, default true | Undo accidental completion without losing records. Application validates this argument is boolean. Task arguments may be an object or its stable ID. |
| `Task.isOverdue(today)` takes a local `YYYY-MM-DD` string, defaulting to today's local date | Preserve calendar dates without UTC shifts. Completed tasks are never overdue. |
| `Task.matchesTags`, `Note.matchesTags`, shared `matchingTags` domain function | Multi-tag OR matching; accept selected IDs or Tag objects; no selection matches all. The original filtering operations remain plural. |
| `Tag.normalizedName` and workspace duplicate check | Trim names and compare case-insensitively to prevent accidental duplicates. Keep the first chosen display capitalization. |
| Optional fourth `tagIds` argument on `submitTask` and `createNote`, default `[]` | Attach zero or more existing shared tags during the same successful save as creation. |
| `LearnerProfile.editNote(id, title, courseName, content, tagIds)`; `Note.edit` | Explicitly save an entire note edit atomically, including metadata and selected tags; update `lastEdited`. `Note.editContent(newContent)` remains available with an optional injected timestamp for deterministic checks. |
| `LearnerProfile.applyTags(kind, id, tagIds)` | Add to existing tasks or notes without erasing previous tags; task interface exposes additive tagging. The note editor instead displays a full selected set and permits intentional removal. |
| `LearnerProfile.load`, `transact`, `getSnapshot`, load error, injectable gateway/clock | Coordinate application operations and storage, retain previous valid state on failed writes, and disable writes after unreadable data. There is one current state plus temporary transaction candidates and detached display snapshots. |
| Snapshot counts, overdue presentation, sorted/filtered record arrays | Keep the View simple; no independent persistent state in the View/Controller. Counts describe the complete dataset, while task/note lists reflect their own selected filters. |
| `PomodoroTimer.mode`, remaining time, deadline, `advance`, `getState`, duration calculation, injected clock | Elapsed-time operation and correct automatic transitions after delayed callbacks. Original start/pause/reset names retained; `start()` also resumes. Defaults stay 25/5. |
| Gateway provider, deferred localStorage access, version-1 JSON envelope, read-before-write guard | Test without browser storage; catch blocked property access; avoid overwriting unreadable/unsupported values; one read per startup and one write per mutation. |
| BrainsController temporary route/filter/dirty state; screen port injected into Controller | Presentation-only state is separate from the persisted domain. Event parsing and feedback coordination remain in the Controller; business rules remain outside it. |

## Explicit assumptions and scope

- Notes require nonblank title, course/lecture, and content. Task title and due date are required; description and tags are optional. Past due dates are valid.
- Titles and course labels are limited to 200 characters; tags to 40; descriptions/content to 100,000. Required text is trimmed; free-form task descriptions preserve formatting. Empty note content is invalid.
- Tasks are sorted by calendar date ascending with stable saved insertion order for ties. Completion does not remove or move a task out of the list. Notes retain creation order.
- Tag filters use OR semantics and are independent per view. Selecting no tags shows all; Clear never alters stored records. Filters and navigation are temporary.
- The default learner name is `Learner`; no login/profile editor is introduced.
- One device, browser profile, origin, and app tab are assumed. Multi-tab writes can overwrite one another; no merge, synchronization, or collaboration is implemented.
- Tasks/notes/tags are persisted; timer state is not. In-app navigation retains the timer; reload/close resets it. Sessions alternate automatically, including when callbacks were delayed. There is no long-break policy or alarm.
- Modern native browser capabilities are acceptable; no framework, backend, cloud SDK, third-party fonts, or runtime package dependencies are introduced.
- localStorage is not encrypted or backed up automatically. Unreadable data is left untouched; manual backup/recovery is documented rather than silently resetting it.
- The timer remains a **planned product feature**. The team must amend the SRS before assigning a requirement number. NFR-1 refers to local-device loading, with no broadband prerequisite.
- Nothing in the empty workspace contradicted the prompt. No prior assignment documents were available to compare.
