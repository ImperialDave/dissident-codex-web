import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Lightweight assertions against built data + reference string shapes.
test("john.json contains John 3:16", () => {
  const john = JSON.parse(
    readFileSync(path.join(ROOT, "public/bible/books/john.json"), "utf8")
  );
  const verse = john.chapters["3"]["16"];
  assert.match(verse, /For God so loved the world/i);
  assert.doesNotMatch(verse, /‡|†/);
});

test("manifest lists 66 books", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(ROOT, "public/bible/manifest.json"), "utf8")
  );
  assert.equal(manifest.books.length, 66);
});

test("reference label patterns", () => {
  const samples = [
    "John 3:16",
    "John 3:16-20",
    "John 3:16,18",
    "John 3:16-4:2",
    "Romans 8:28",
  ];
  for (const sample of samples) {
    assert.match(sample, /^[1-3]? ?[A-Za-z]+ \d+:\d+/);
  }
});