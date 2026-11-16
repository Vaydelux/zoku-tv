import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Structural guard only. Firebase Emulator integration is needed to test
// authenticated authorization semantics against actual Rules evaluation.
test("profile updates validate changed fields rather than legacy stored values", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  assert.match(rules, /function validProfileUpdate\(\)/);
  assert.match(rules, /data\.diff\(resource\.data\)\.affectedKeys\(\)/);
  assert.match(rules, /validProfileFields\(data, changedKeys\)/);
  assert.match(rules, /allow update: if isOwner\(userId\) && validProfileUpdate\(\)/);
  assert.match(rules, /allow create: if isOwner\(userId\) && validProfileCreate\(\)/);
  assert.match(rules, /data\.homeGenreRailPreferences\.size\(\) <= 50/);
  assert.doesNotMatch(rules, /allow update: if isOwner\(userId\) && validProfileFields\(\)/);
});
