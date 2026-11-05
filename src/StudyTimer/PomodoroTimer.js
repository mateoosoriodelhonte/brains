export class PomodoroTimer {
  constructor(workMinutes = 25, breakMinutes = 5, clock = () => Date.now()) {
    if (
      ![workMinutes, breakMinutes].every(
        (value) => Number.isFinite(value) && value > 0 && value <= 180,
      )
    ) {
      throw new Error(
        "Timer durations must be greater than zero and at most 180 minutes.",
      );
    }
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    this.clock = clock;
    this.reset();
  }
  duration(mode = this.mode) {
    return (mode === "work" ? this.workMinutes : this.breakMinutes) * 60000;
  }
  start() {
    if (this.isRunning) return;
    this.deadline = this.clock() + this.remainingMs;
    this.isRunning = true;
  }
  advance(now = this.clock()) {
    if (!this.isRunning) return;
    if (now >= this.deadline) {
      const cycle = this.duration("work") + this.duration("break");
      // Skip complete cycles, then handle at most two boundaries, even after sleep.
      this.deadline += Math.floor((now - this.deadline) / cycle) * cycle;
      while (now >= this.deadline) {
        this.mode = this.mode === "work" ? "break" : "work";
        this.deadline += this.duration();
      }
    }
    this.remainingMs = Math.max(0, this.deadline - now);
  }
  pause() {
    this.advance();
    this.isRunning = false;
    this.deadline = null;
  }
  reset() {
    this.mode = "work";
    this.isRunning = false;
    this.deadline = null;
    this.remainingMs = this.duration();
  }
  getState() {
    this.advance();
    return {
      mode: this.mode,
      isRunning: this.isRunning,
      remainingMs: this.remainingMs,
      durationMs: this.duration(),
      workMinutes: this.workMinutes,
      breakMinutes: this.breakMinutes,
    };
  }
}
