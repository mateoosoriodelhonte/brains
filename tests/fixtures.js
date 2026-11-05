export class FakeStorage {
  constructor(raw = null) {
    this.raw = raw;
    this.reads = 0;
    this.writes = 0;
    this.failRead = false;
    this.failWrite = false;
  }
  getItem() {
    this.reads++;
    if (this.failRead) throw new Error("Access denied");
    return this.raw;
  }
  setItem(key, value) {
    if (this.failWrite) throw new Error("Quota exceeded");
    this.writes++;
    this.raw = value;
  }
}

export class FakeGateway {
  constructor(records = null) {
    this.saved = records;
    this.fail = false;
    this.writes = 0;
  }
  load() {
    return structuredClone(this.saved);
  }
  save(records) {
    if (this.fail) throw new Error("Test storage unavailable");
    this.saved = structuredClone(records);
    this.writes++;
  }
}

export function taskFixture(count = 200) {
  return {
    version: 1,
    workspace: {
      name: "Performance fixture",
      tags: [
        { id: "fixture-course", name: "Course" },
        { id: "fixture-cert", name: "Certification" },
      ],
      notes: [],
      tasks: Array.from({ length: count }, (_, index) => ({
        id: `fixture-task-${index}`,
        title: `Study task ${String(index + 1).padStart(3, "0")}`,
        dueDate: `2026-11-${String((index % 28) + 1).padStart(2, "0")}`,
        description:
          "Separate test fixture; never loaded into the normal application.",
        isComplete: index % 7 === 0,
        tagIds: [index % 2 === 0 ? "fixture-course" : "fixture-cert"],
      })),
    },
  };
}
