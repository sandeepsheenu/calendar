import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the FocusCal application shell and metadata", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /FocusCal — Calendar & Task Planner/);
  assert.match(page, /Click any day to add an item/);
  assert.match(page, /Daily capacity/);
});
