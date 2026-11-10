# Verification record

## November 10, 2026 repository and input-safety follow-up

- Expanded `.gitignore` patterns were checked with `git check-ignore`; `git ls-files -ci --exclude-standard` found no tracked files matching ignore rules.
- `npm test`: **25 passed, 0 failed**, including new SQL-looking text persistence and literal identifier tests.
- `npx playwright test tests/browser/flows.spec.js -g injection`: **1 passed, 0 failed**, exercising SQL-like input and hostile markup across task/tag/note display, reload, and note editing.
- Production builds passed locally, including the build started by the browser test runner.
- Added the **Project checks** GitHub Actions workflow for unit tests and production builds. Remote run status is available in the repository's Actions tab; local results do not imply a remote run has passed.
- The existing runtime JSON serialization and text escaping were reviewed and retained. No SQL backend was introduced. See [security boundaries](security.md).
- The complete browser suite and performance measurement below are the earlier November 5 results; they were not repeated for this documentation/test-only follow-up.

## November 5, 2026 MVP verification

Verified November 5, 2026, in the local environment available to this Codex session. These results describe tests actually executed, not checks inferred from the code.

## Results

| Check | Result |
| --- | --- |
| `npm test` | **23 passed, 0 failed**: model, application transactions, storage, timer, and architecture |
| `npm run build` | **Passed**: Vite production bundle generated successfully |
| `npm run test:browser` | **11 passed, 0 failed** in 17.2 seconds, including the performance measurement |
| `npm audit --omit=dev` | **0 vulnerabilities** reported; no runtime package dependencies |
| Dependency install | `npm install` completed with **0 vulnerabilities** reported for the installed dependency tree |
| Browser visual inspection | Desktop Dashboard, Notes, Timer and 390 px phone Dashboard screenshots inspected; no clipping or horizontal overflow found in those captures |

The final browser suite builds and serves the production bundle itself on loopback, so it checks production code rather than Vite's development transformation. The first run had one completion-control timeout; after correcting the unnecessary row replacement, the suite passed. Further feedback/focus review added failed-completion coverage, and the final full suite above passed.

## Behavior exercised

- Empty workspace, required/whitespace title validation, missing due date, past dates, zero tags, multiple tags, shared reusable tags, duplicate-name rejection.
- Earliest-due sorting, stable equal-date ordering, overdue pending state, completion and return to pending across reload.
- Multi-tag OR matching and clearing, with no persistence writes from filtering.
- Tagged note creation/edit/restoration, changed edit timestamp, explicit Save, unsaved indication, cancel/discard warning, and hostile markup displayed as inert text in both card and editor.
- Versioned JSON round trips, invalid JSON and versions untouched, malformed domain records locked, blocked storage property/read, quota failures preserving data/drafts, failed completion restoring checkbox/counts/focus, no new success feedback after failed save.
- Timer start/pause/resume/reset, exact work/break boundaries, delayed updates/many skipped cycles, state across in-app navigation. Browser tests use a controlled clock, rather than waiting 30 real minutes.
- Browser timezone checks in America/Los_Angeles and Pacific/Auckland retain the selected `2026-11-05` date after save and reload.
- Phone width 390 × 844, keyboard skip-link focus, navigation/form controls, and page width check. Main flow passes while external requests are blocked; **zero external asset requests** were observed. Loopback requests to the local server remain allowed.
- Static import checks enforce the six component folders, allowed dependency directions, and no circular module imports.

## NFR-1 measurements

Environment: Apple M2 Pro, 16 GiB RAM, arm64, macOS 27.0.1 (Darwin 27.0.0), Node v26.0.0, installed Google Chrome 157.0.8103.38 in headless mode, 1440 × 1000 viewport, America/Denver browser timezone. No CPU throttling was applied.

**20 of 20 runs completed within 2,000 ms** (requirement: at least 19).

- Minimum: **93.3 ms**
- Median: **95.1 ms**
- 95th percentile: **98.2 ms**
- Maximum: **99.6 ms**

Method: use the production Vite build over loopback; create a fresh browser context for each navigation so browser cache/storage are isolated; seed exactly 200 tasks from `tests/fixtures.js` before app startup; measure `performance.now()` from navigation start through two animation frames after all 200 task rows exist. Every run asserts exactly 200 rows and exactly one workspace storage read. The same browser process is reused; the local server and OS filesystem may be warm. This includes layout and a paint opportunity, not physical display instrumentation.

All unrounded durations, environment details, and per-run read/row counts are committed in [performance-results.json](performance-results.json). Reproduce with `npm run test:performance`; the report is regenerated.

**Environment limit:** this is the Mac available to Codex. It has not been established that this is the team's designated course test laptop. Repeat there before claiming NFR-1 is verified on that laptop.

## Remaining limits

- Automated browser coverage is installed desktop Chrome, including emulated phone viewport and timezones. Safari, Firefox, actual phones, full assistive-technology auditing, and the designated test laptop are not verified here.
- Local behavior was tested with all external requests blocked, while the local HTTP server remained available. The app is not a service-worker installation and cannot load a fresh page if its local server is stopped.
- One-tab use only; no multi-tab conflict handling, encryption, export/import, or automatic backup. Browser storage can be cleared by the user/browser.
- Timer state resets on reload; no external alarm/notification. Tests exercise long intervals with a fake clock rather than a physical 30-minute session.
- No claim is made that the team has reviewed these files, performed the demo, or amended its SRS. The timer remains a planned feature.
