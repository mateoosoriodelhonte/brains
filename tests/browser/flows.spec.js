import { test, expect } from "@playwright/test";

async function createTag(page, name) {
  await page.getByLabel("Create a reusable tag").fill(name);
  await page.getByRole("button", { name: "Create tag", exact: true }).click();
  await expect(page.locator("#tag-error")).toBeEmpty();
}

async function createTask(page, title, dueDate, tags = []) {
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  await page.getByLabel("Task title").fill(title);
  await page.getByLabel("Due date").fill(dueDate);
  for (const tag of tags)
    await page.getByRole("dialog").getByLabel(tag, { exact: true }).check();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("injection payloads stay inert in task, tag, and note rendering and storage", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await createTask(page, "Keep this original task", "2026-11-10");
  const sql = "'); DROP TABLE tasks; --";
  const markup = "<svg onload=window.x=1>";
  const title = `${sql} <img src=x onerror=window.x=1>`;
  await createTag(page, sql);
  await createTag(page, markup);
  await createTask(page, title, "2026-11-11", [sql, markup]);
  await expect(page.locator(".task-copy h3")).toHaveText([
    "Keep this original task",
    title,
  ]);
  await expect(page.locator(".task-copy img, .task-copy svg")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: markup, exact: true }).locator("svg"),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await expect(page.locator(".task-copy h3").last()).toHaveText(title);
  expect(await page.evaluate(() => window.x)).toBeUndefined();

  await page.locator("nav").getByRole("button", { name: "Notes" }).click();
  await page
    .getByRole("button", { name: "Add note", exact: true })
    .first()
    .click();
  const content =
    "'); DELETE FROM notes; --\n</textarea><img src=x onerror=window.x=1>";
  await page.getByLabel("Note title").fill(title);
  await page.getByLabel("Course or lecture").fill("' OR 1=1 --");
  await page.getByLabel("Content", { exact: false }).fill(content);
  await page.getByRole("dialog").getByLabel(sql, { exact: true }).check();
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.reload();
  await page.locator("nav").getByRole("button", { name: "Notes" }).click();
  await expect(page.locator(".note-excerpt")).toHaveText(content);
  await expect(page.locator(".note-card img, .note-card script")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: `Edit ${title}`, exact: true })
    .click();
  await expect(page.getByLabel("Content", { exact: false })).toHaveValue(
    content,
  );
  await expect(page.getByRole("dialog").locator("img, script")).toHaveCount(0);
  const records = await page.evaluate(
    () => JSON.parse(localStorage.getItem("brains.workspace")).workspace,
  );
  expect(records.tasks).toHaveLength(2);
  expect(records.tasks[0].title).toBe("Keep this original task");
  expect(records.notes[0].content).toBe(content);
  expect(await page.evaluate(() => window.x)).toBeUndefined();
  expect(errors).toEqual([]);
});

test("tasks: validation, reusable tags, due order, completion, OR filtering, and reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Your next step starts here.")).toBeVisible();
  await createTag(page, "SUU");
  await createTag(page, "Security");
  await page.getByLabel("Create a reusable tag").fill(" suu ");
  await page.getByRole("button", { name: "Create tag", exact: true }).click();
  await expect(page.locator("#tag-error")).toHaveText(
    "A tag with this name already exists.",
  );
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  await page.getByLabel("Task title").fill("   ");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.locator("#form-error")).toHaveText(
    "Task title is required.",
  );
  await expect(page.locator(".task-row")).toHaveCount(0);
  await page.getByLabel("Task title").fill("Read a chapter");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.locator("#form-error")).toHaveText(
    "A valid due date is required.",
  );
  await page.getByLabel("Due date").fill("2026-11-20");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await createTask(page, "University assignment", "2020-01-02", ["SUU"]);
  await createTask(page, "Certification practice", "2020-01-03", [
    "Security",
    "SUU",
  ]);
  await expect(page.locator(".task-copy h3")).toHaveText([
    "University assignment",
    "Certification practice",
    "Read a chapter",
  ]);
  await expect(page.locator(".status.overdue")).toHaveCount(2);
  await page
    .getByRole("checkbox", {
      name: "Mark University assignment complete",
      exact: true,
    })
    .check();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  const beforeFilter = await page.evaluate(() =>
    localStorage.getItem("brains.workspace"),
  );
  await page.getByRole("button", { name: "SUU", exact: true }).click();
  await page.getByRole("button", { name: "Security", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(3);
  expect(
    await page.evaluate(() => localStorage.getItem("brains.workspace")),
  ).toBe(beforeFilter);
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: "Mark University assignment pending",
      exact: true,
    }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", {
      name: "Mark University assignment pending",
      exact: true,
    })
    .uncheck();
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: "Mark University assignment complete",
      exact: true,
    }),
  ).not.toBeChecked();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("existing task tags are additive and keep shared identity after reload", async ({
  page,
}) => {
  await page.goto("/");
  await createTag(page, "A");
  await createTag(page, "B");
  await createTask(page, "Tagged task", "2026-11-05", ["A"]);
  const task = page.locator(".task-row");
  await task.getByText("Edit tags", { exact: true }).click();
  await task.getByLabel("B", { exact: true }).check();
  await task.getByLabel("A", { exact: true }).uncheck();
  await task.getByRole("button", { name: "Save tags", exact: true }).click();
  await page.reload();
  await expect(task.locator(".tag-chip")).toHaveText(["A", "B"]);
});

test("notes: explicit saving, unsaved warnings, safe text, editing, filters, restoration", async ({
  page,
}) => {
  await page.goto("/");
  await createTag(page, "Architecture");
  await createTag(page, "Lecture");
  await page
    .getByRole("button", { name: "Notes", exact: false })
    .filter({ has: page.locator("svg") })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Add note", exact: true })
    .first()
    .click();
  await page.getByLabel("Note title").fill("Layers & MVC");
  await page.getByLabel("Course or lecture").fill("CS 2450");
  const content =
    '\n  </textarea><img src=x onerror="window.xss=true">\n  Model → Controller\n';
  await page.getByLabel("Content", { exact: false }).fill(content);
  await page
    .getByRole("dialog")
    .getByLabel("Architecture", { exact: true })
    .check();
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("brains.workspace")).workspace.notes,
    ),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.locator(".note-excerpt")).toHaveText(content);
  expect(await page.evaluate(() => window.xss)).toBeUndefined();
  await page
    .getByRole("button", { name: "Edit Layers & MVC", exact: true })
    .click();
  await expect(page.getByLabel("Content", { exact: false })).toHaveValue(
    content,
  );
  await page.getByLabel("Content", { exact: false }).fill("Unsaved draft");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".note-excerpt")).toHaveText(content);
  const beforeEdited = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("brains.workspace")).workspace.notes[0]
        .lastEdited,
  );
  await page
    .getByRole("button", { name: "Edit Layers & MVC", exact: true })
    .click();
  await page
    .getByLabel("Content", { exact: false })
    .fill("Revised explanation of the layers.");
  await page.getByRole("dialog").getByLabel("Lecture", { exact: true }).check();
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  const afterEdited = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("brains.workspace")).workspace.notes[0]
        .lastEdited,
  );
  expect(Date.parse(afterEdited)).toBeGreaterThan(Date.parse(beforeEdited));
  await page.getByRole("button", { name: "Architecture", exact: true }).click();
  await page.getByRole("button", { name: "Lecture", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.reload();
  await page.locator("nav").getByRole("button", { name: "Notes" }).click();
  await expect(page.locator(".note-excerpt")).toHaveText(
    "Revised explanation of the layers.",
  );
  await expect(page.locator(".note-card .tag-chip")).toHaveText([
    "Architecture",
    "Lecture",
  ]);
  await page.screenshot({
    path: "test-results/notes-desktop.png",
    fullPage: true,
  });
});

test("malformed stored data shows a warning and stays untouched", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("brains.workspace", "{unreadable"),
  );
  await page.goto("/");
  await expect(page.locator("#storage-error")).toContainText("kept untouched");
  await expect(
    page.getByRole("button", { name: "Add task", exact: true }).first(),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("brains.workspace")),
  ).toBe("{unreadable");
});

test("unavailable storage is reported without crashing", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator("#storage-error")).toContainText(
    "storage is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Create tag", exact: true }),
  ).toBeDisabled();
});

test("a failed save keeps the existing dashboard and draft, with no success feedback", async ({
  page,
}) => {
  await page.goto("/");
  await createTask(page, "Existing task", "2026-11-05");
  const before = await page.evaluate(() =>
    localStorage.getItem("brains.workspace"),
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Add task", exact: true })
    .first()
    .click();
  await page.getByLabel("Task title").fill("Cannot save");
  await page.getByLabel("Due date").fill("2026-11-06");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.locator("#form-error")).toContainText("Could not save");
  await expect(page.locator("#feedback")).toBeEmpty();
  await expect(page.getByLabel("Task title")).toHaveValue("Cannot save");
  await expect(page.locator(".task-row")).toHaveCount(1);
  expect(
    await page.evaluate(() => localStorage.getItem("brains.workspace")),
  ).toBe(before);
});

test("failed completion restores the checkbox and counts while keeping focus", async ({
  page,
}) => {
  await page.goto("/");
  await createTask(page, "Keep pending", "2026-11-05");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  const checkbox = page.getByRole("checkbox", {
    name: "Mark Keep pending complete",
    exact: true,
  });
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeFocused();
  await expect(page.locator('[data-count="pending"]')).toHaveText("1");
  await expect(page.locator('[data-count="complete"]')).toHaveText("0");
  await expect(page.locator("#feedback")).toContainText("Could not save");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("brains.workspace")).workspace.tasks[0]
          .isComplete,
    ),
  ).toBe(false);
});

test("timer: start, pause, resume, automatic work/break transitions, navigation, reset", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page
    .locator("nav")
    .getByRole("button", { name: "Timer", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page
    .getByRole("button", { name: "Start focus session", exact: true })
    .click();
  await page.clock.fastForward(10000);
  await expect(page.getByRole("timer")).toHaveText("24:50");
  await page.getByRole("button", { name: "Pause timer", exact: true }).click();
  await page.clock.fastForward(60000);
  await expect(page.getByRole("timer")).toHaveText("24:50");
  await page.getByRole("button", { name: "Resume timer", exact: true }).click();
  await page.clock.fastForward(1490000);
  await expect(page.locator("#timer-mode")).toHaveText("Break time");
  await expect(page.getByRole("timer")).toHaveText("05:00");
  await page.clock.fastForward(300000);
  await expect(page.locator("#timer-mode")).toHaveText("Work session");
  await page
    .locator("nav")
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await page.clock.fastForward(10000);
  await page
    .locator("nav")
    .getByRole("button", { name: "Timer", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveText("24:50");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await expect(
    page.getByRole("button", { name: "Start focus session", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/timer-desktop.png",
    fullPage: true,
  });
});

test("phone layout, keyboard focus, empty state, and main flows need no external network", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const external = [];
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content", exact: true }),
  ).toBeFocused();
  await createTag(page, "Baking");
  await createTask(page, "Practice sourdough", "2026-11-05", ["Baking"]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Practice sourdough", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-phone.png",
    fullPage: true,
  });
  expect(external).toEqual([]);
});

test("due dates display unchanged in timezones on either side of UTC", async ({
  browser,
}) => {
  for (const timezoneId of ["America/Los_Angeles", "Pacific/Auckland"]) {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await createTask(page, "Calendar date", "2026-11-05");
    await page.reload();
    await expect(page.locator(".task-date time")).toHaveText("Nov 5, 2026");
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("brains.workspace")).workspace
            .tasks[0].dueDate,
      ),
    ).toBe("2026-11-05");
    await context.close();
  }
});
