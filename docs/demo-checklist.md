# Brains demo checklist

Run `npm ci` and `npm run dev`, then open the printed local URL. Use the same browser and URL throughout. A new origin/profile starts empty; the normal app is not prepopulated. The following sample information is entered manually for the demo.

- [ ] **Add without tags:** Add a task titled “Read software engineering chapter”, choose a due date, leave tags empty, and Save. Show that it appears.
- [ ] **Validation:** Open Add task and submit a whitespace-only title or omit the due date. Show inline error and unchanged saved task count. Cancel the draft.
- [ ] **Reusable tags:** Create “SUU”, “Cybersecurity”, and “Baking” in the sidebar. Try “ suu ”; show the duplicate error.
- [ ] **Different learning sources:** Add an SUU assignment, a cybersecurity practice task, and a baking class task. Select more than one tag on at least one task. All appear on one Dashboard.
- [ ] **Due-date ordering:** Choose different dates and show earliest first. Add two tasks with the same date; their creation order is retained. Enter a past deadline and show its written “Overdue” status.
- [ ] **Apply another tag:** Expand a task's tag action, select another existing tag, and Save tags. Show that existing tags remain.
- [ ] **Edit a task:** Change its title, due date, or description and save. Show it in the new position on the dashboard. In **Add tags**, enter a new tag name and show that saving attaches it to the task and makes it available on the sidebar.
- [ ] **Completion:** Check a pending task; show its completed status, crossed-out title, and updated count. Uncheck it to undo; complete it again for the reload check.
- [ ] **Tagged note:** Open Notes → Add note. Enter a title, course/lecture, content, and optional shared tags. Show “Unsaved changes”, then Save note.
- [ ] **Edit a note:** Open the note, change its content, show unsaved status, then Save note. Show the updated content/edit time. Optionally demonstrate Cancel's discard warning.
- [ ] **Task filtering:** Select two sidebar tags. Explain that any selected tag matches (OR). Use Clear to restore every task, including untagged ones.
- [ ] **Note filtering:** Open Notes, select tags, show matching notes, and Clear. Filters are independent for each view.
- [ ] **Persistence:** Reload at the same URL. Show saved tasks, completion, reusable tags, and edited notes. Filters reset; saved records remain.
- [ ] **Pomodoro:** Open Timer, show 25-minute work/5-minute break defaults, Start, Pause, Resume, and Reset. Navigate away and back while running. Explain that work and break alternate automatically; reload resets the timer. Automated fake-clock tests exercise full transitions without a 30-minute demo.
- [ ] **Responsive/keyboard:** Narrow the viewport, use keyboard navigation, and show visible focus, connected labels, and written statuses.
- [ ] **Local operation:** Explain that the local server serves files and all data stays in this browser's localStorage. No school platform, cloud account, or network API is involved. One tab at a time.

## Evidence and course caveats

- Run `npm test`, `npm run build`, and `npm run test:browser` to reproduce checks.
- Run `npm run test:performance` on the designated course test laptop. It seeds 200 fixture tasks into isolated browser contexts, opens the production dashboard 20 times, asserts 200 rows and one storage read each time, and writes every duration plus environment details to `docs/performance-results.json`. At least 19 runs must be at or below 2,000 ms.
- Do not describe another machine's performance as verified on the designated laptop. Keep actual measurements with the environment used.
- FR-1 through FR-6 cover tasks, notes, and tags. Describe the timer as a planned feature until the SRS is updated.
- Review `docs/ai-usage.md` and the implementation before presenting. This checklist records demonstration steps, not a claim the team has already performed them.
