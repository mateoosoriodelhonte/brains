import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

test("six components obey allowed import directions with no circular module imports", async () => {
  const allowed = {
    BrainsScreens: ["BrainsController", "TaskNoteModel"],
    BrainsController: ["LearnerWorkspace"],
    LearnerWorkspace: ["TaskNoteModel", "StudyTimer", "LocalStorageGateway"],
    TaskNoteModel: [],
    StudyTimer: [],
    LocalStorageGateway: [],
  };
  const root = path.resolve("src");
  assert.deepEqual(
    (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(),
    Object.keys(allowed).sort(),
  );
  const graph = new Map();
  for (const component of Object.keys(allowed)) {
    for (const filename of await readdir(path.join(root, component))) {
      if (!filename.endsWith(".js")) continue;
      const file = path.join(root, component, filename);
      const source = await readFile(file, "utf8");
      const imports = [...source.matchAll(/from\s+['"](.+?)['"]/g)].map(
        (match) => path.resolve(path.dirname(file), match[1]),
      );
      for (const target of imports) {
        const targetComponent = path.relative(root, target).split(path.sep)[0];
        assert.ok(
          targetComponent === component ||
            allowed[component].includes(targetComponent),
          `${component} → ${targetComponent} is forbidden`,
        );
      }
      graph.set(file, imports);
    }
  }
  function visit(file, parents = []) {
    assert.ok(
      !parents.includes(file),
      `Circular import: ${[...parents, file].join(" → ")}`,
    );
    for (const dependency of graph.get(file) ?? [])
      visit(dependency, [...parents, file]);
  }
  for (const file of graph.keys()) visit(file);
});
