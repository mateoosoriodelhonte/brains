import { test } from "node:test";
import assert from "node:assert/strict";
import { PomodoroTimer } from "../src/StudyTimer/PomodoroTimer.js";

test("timer defaults, start, pause, resume, and reset use elapsed time", () => {
  let now = 0;
  const timer = new PomodoroTimer(25, 5, () => now);
  assert.equal(timer.getState().remainingMs, 1500000);
  assert.equal(timer.isRunning, false);
  timer.start();
  now = 10050;
  assert.equal(timer.getState().remainingMs, 1489950);
  timer.start(); // Starting twice cannot move the deadline.
  timer.pause();
  const remaining = timer.remainingMs;
  now += 50000;
  assert.equal(timer.getState().remainingMs, remaining);
  timer.start();
  now += 2000;
  assert.equal(timer.getState().remainingMs, remaining - 2000);
  timer.reset();
  assert.deepEqual(timer.getState(), {
    mode: "work",
    isRunning: false,
    remainingMs: 1500000,
    durationMs: 1500000,
    workMinutes: 25,
    breakMinutes: 5,
  });
});

test("work/break boundaries, delayed callbacks, and multiple missed cycles remain accurate", () => {
  let now = 0;
  const timer = new PomodoroTimer(25, 5, () => now);
  timer.start();
  now = 1500000;
  assert.equal(timer.getState().mode, "break");
  assert.equal(timer.remainingMs, 300000);
  now = 1800000;
  assert.equal(timer.getState().mode, "work");
  assert.equal(timer.remainingMs, 1500000);
  now = 1800000 * 500 + 1500000 + 12500;
  assert.equal(timer.getState().mode, "break");
  assert.equal(timer.remainingMs, 287500);
  timer.pause();
  assert.equal(timer.isRunning, false);
  assert.equal(timer.mode, "break");
});

test("invalid timer durations are rejected", () => {
  for (const minutes of [0, -1, NaN, Infinity, 181])
    assert.throws(() => new PomodoroTimer(minutes, 5), /durations/);
});
