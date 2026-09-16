import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessages } from "../src/utils/messages.js";

test("mergeMessages deduplicates replayed messages and keeps the newest payload", () => {
  const merged = mergeMessages(
    [
      { _id: "one", message: "first" },
      { _id: "two", message: "second" },
    ],
    [
      { _id: "two", message: "updated" },
      { _id: "three", message: "third" },
    ],
  );

  assert.deepEqual(merged, [
    { _id: "one", message: "first" },
    { _id: "two", message: "updated" },
    { _id: "three", message: "third" },
  ]);
});
