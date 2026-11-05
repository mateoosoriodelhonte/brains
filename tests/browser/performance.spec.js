import { test, expect } from "@playwright/test";
import os from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { taskFixture } from "../fixtures.js";

test("NFR-1: 200 tasks render within 2 seconds in at least 19 of 20 navigations", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const runs = [];
  for (let run = 1; run <= 20; run++) {
    const context = await browser.newContext({
      timezoneId: "America/Denver",
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript((fixture) => {
      localStorage.setItem("brains.workspace", JSON.stringify(fixture));
      window.__storageReads = 0;
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key === "brains.workspace") window.__storageReads++;
        return original.call(this, key);
      };
      const observer = new MutationObserver(() => {
        if (document.querySelectorAll("[data-task-id]").length === 200) {
          observer.disconnect();
          // Include layout and the first paint opportunity after all rows exist.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.__dashboardRenderMs = performance.now();
            }),
          );
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    }, taskFixture());
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/");
    await page.waitForFunction(() => window.__dashboardRenderMs !== undefined);
    const result = await page.evaluate(() => ({
      durationMs: window.__dashboardRenderMs,
      storageReads: window.__storageReads,
      tasks: document.querySelectorAll("[data-task-id]").length,
    }));
    expect(result.tasks).toBe(200);
    expect(result.storageReads).toBe(1);
    runs.push({ run, ...result, passed: result.durationMs <= 2000 });
    await context.close();
  }
  const durations = runs.map((run) => run.durationMs).sort((a, b) => a - b);
  const report = {
    measuredAt: new Date().toISOString(),
    environment: {
      platform: os.platform(),
      release: os.release(),
      architecture: os.arch(),
      cpu: os.cpus()[0]?.model,
      memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
      node: process.version,
      browser: browser.version(),
      channel: process.env.BRAINS_BROWSER_CHANNEL || "chrome",
      headless: true,
      viewport: "1440 × 1000",
      timezone: "America/Denver",
    },
    method:
      "Production Vite build served over loopback. Twenty new isolated browser contexts (cold browser cache), each seeded with 200 separate fixture tasks before loading. performance.now() from navigation start through two animation frames after all 200 rows exist. One localStorage read asserted per navigation. Same browser process, no CPU throttling; this is not a physical monitor paint measurement.",
    thresholdMs: 2000,
    requiredPasses: 19,
    passedRuns: runs.filter((run) => run.passed).length,
    minMs: durations[0],
    medianMs: (durations[9] + durations[10]) / 2,
    p95Ms: durations[18],
    maxMs: durations[19],
    runs,
    limitation:
      "Measured on the Mac available to this Codex session. The team must repeat on the designated course test laptop before claiming that laptop satisfies NFR-1.",
  };
  await mkdir("docs", { recursive: true });
  await writeFile(
    "docs/performance-results.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `NFR-1 environment result: ${report.passedRuns}/20 within 2000 ms; min ${report.minMs.toFixed(1)}, median ${report.medianMs.toFixed(1)}, p95 ${report.p95Ms.toFixed(1)}, max ${report.maxMs.toFixed(1)} ms.`,
  );
  expect(report.passedRuns).toBeGreaterThanOrEqual(19);
});
