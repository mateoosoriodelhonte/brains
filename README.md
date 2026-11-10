# Brains

A local learning hub for university assignments, certifications, independent courses, and activities outside school. Track deadlines, complete tasks, keep course or lecture notes, reuse your own tags, filter by several tags, and focus with a Pomodoro timer.

**CS 2450 Software Engineering · Southern Utah University**

Team: Mateo Osorio Delhonte and Priscilla Gyllenskog

## Run locally

Use Node.js 20.19+ on the Node 20 line, or Node.js 22.12 or newer, and npm. From the project directory:

```sh
npm ci
npm run dev
```

Open the local URL Vite prints, normally **http://127.0.0.1:5173**. No login or external account is needed. The initial workspace is empty.

For the production build:

```sh
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. Keep the local server running. The server only serves files; it is not a remote backend. The app bundles all scripts, styles, icons, and system fonts locally. Once dependencies are installed, building and running need no internet access. Do not open `index.html` directly with `file://`.

Vite setup follows the [official Vite guide](https://vite.dev/guide/). Versions are pinned in `package.json` and `package-lock.json`.

## What belongs in Git

Commit source code, tests, documentation, `package.json`, and `package-lock.json`. The root `.gitignore` excludes installed dependencies, builds, test screenshots/traces, coverage, logs, local environment files, credential/key files, and personal backups. Sanitized example environment files such as `.env.example` remain allowed.

Before committing, inspect `git status` and `git diff --cached`. Ignore rules do not remove already tracked files or detect every possible secret; never commit real passwords, tokens, or personal workspace data. Keep the lockfile tracked so both teammates install the same dependency versions.

## Checks

```sh
npm test                    # Node's built-in runner: domain, application, storage, architecture
npm run build               # Production bundle
npm run test:browser        # Main flows + NFR-1 on the production bundle
npm run test:performance    # Only the 20-run, 200-task measurement
```

Browser tests use an installed Google Chrome by default. No personal Chrome profile is opened. If Chrome is unavailable, install Playwright's Chromium and select it:

```sh
npx playwright install chromium
BRAINS_BROWSER_CHANNEL=chromium npm run test:browser
```

Browser tests start and stop their own production preview on port 4173; stop any other preview using that port first. Every browser test uses an isolated context. Fixtures live in `tests/fixtures.js`, never in the normal app. Screenshots and failure traces go to ignored `test-results/`. Performance tests regenerate `docs/performance-results.json` with all 20 raw measurements and the actual environment. See [verification results](docs/verification.md).

## Local storage and limitations

- Tasks, completion status, notes, edit dates, and tags are saved as one versioned JSON record under **`brains.workspace`** in this browser's localStorage.
- Your browser, profile, hostname, and port define the workspace. Development on port 5173 and preview on port 4173 have separate data. `localhost` and `127.0.0.1` also have separate data. Keep using the same URL.
- Use **one app tab at a time**. Simultaneous tabs are not coordinated and a later save can replace another tab's changes. No multi-tab collaboration is implemented.
- No cloud sync, platform connections, logins, remote notifications, analytics, or network API calls. Local storage is not encrypted; anyone with access to this browser profile may read it.
- Clearing browser data or using a temporary/private profile can lose the workspace. The MVP has no in-app export/import or automatic backup.
- The timer defaults to 25-minute work and 5-minute break sessions, transitions automatically, and continues accurately across delayed callbacks and navigation within the app. Keep the tab open. Reloading or closing the tab resets the timer. Timer state and selected filters are deliberately not persisted. No alarm or external notification is sent.
- Notes need a title, course/lecture, and nonblank content. Save explicitly. Unsaved changes are marked and closing the form asks before discarding them. Browser reload/close warnings depend on browser support.
- Task tags can be added after creation without removing existing tags. The note editor shows the complete selected set and allows intentional tag removal. Tag rename/deletion and task edit/deletion are outside this MVP.
- Modern browsers with ES modules, `crypto.randomUUID`, native `<dialog>`, localStorage, and current CSS support are expected. Automated browser coverage is Chrome; Safari, Firefox, actual mobile devices, and full screen-reader auditing remain unverified.

### If saving fails

A failed write keeps the prior dataset intact and leaves the draft available. The app shows an error, never a new success message. Free browser storage or allow site storage, then try again.

If saved JSON, its version, or its relationships are unreadable, the app disables saving and leaves the original value untouched. Do not clear browser data as a first step:

1. At the same origin, open browser Developer Tools → Application → Local Storage (wording varies by browser).
2. Copy the entire `brains.workspace` value to a text file before changing anything. It may contain personal notes.
3. Repair the backed-up version-1 records, or restore a known valid backup. If you explicitly choose to start over after backing up, remove **only** the `brains.workspace` key.
4. Reload. A valid dataset loads, or a missing key opens an empty workspace. Other saved keys are never cleared by Brains.

There is no automatic format migration or automatic reset of corrupted records.

## Components

| Folder under `src/` | Responsibility | Owned domain classes |
| --- | --- | --- |
| `BrainsScreens` | HTML/CSS, accessible forms, task rows, notes, tags, timer display | None |
| `BrainsController` | Parses events/forms, calls application operations, coordinates feedback/rendering | None |
| `LearnerWorkspace` | Loading, reconstruction, transactional operations, saving, timer coordination | `LearnerProfile` |
| `TaskNoteModel` | Validation, tasks, notes, reusable tags, sorting and OR filtering | `TaskList`, `Task`, `Note`, `Tag` |
| `StudyTimer` | Deadline-based work/break state and transitions | `PomodoroTimer` |
| `LocalStorageGateway` | One-record localStorage access and version envelope | None |

`src/main.js` only connects the components. Read [architecture](docs/architecture.md), [requirements traceability](docs/requirements-traceability.md), [design changes](docs/design-changes.md), and [AI assistance](docs/ai-usage.md).

## Demonstrate it

1. Add an untagged task, then create tags for SUU, a certification, and another activity.
2. Add tasks with different due dates and tag combinations. Past dates are allowed and marked overdue.
3. Complete a task; uncheck it to return it to pending.
4. Select multiple sidebar tags. Matching uses **OR**: any selected tag matches. Clear to see everything.
5. Open Notes, create a tagged course note, reopen it, edit, and explicitly Save.
6. Filter notes, clear, and reload to show saved tasks, completion, notes, and tags.
7. Open Timer; start, pause, resume, and reset.

See the fuller [demo checklist](docs/demo-checklist.md). The timer is a **planned product feature**, separate from FR-1 through FR-6 until the team updates the SRS.
