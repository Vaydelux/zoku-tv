import assert from "node:assert/strict";
import test from "node:test";
import { describeGenreSaveError } from "./firebase-save-errors";

test("permission-denied error clearly identifies profile rules and owner check", () => {
  const issue = describeGenreSaveError({ code: "firestore/permission-denied", message: "secret" }, "write");
  assert.equal(issue.code, "permission-denied");
  assert.match(issue.message, /deployed Firestore security rules/);
  assert.doesNotMatch(issue.message, /secret/);
});

test("known cloud errors produce actionable UI messages", () => {
  for (const code of ["unauthenticated", "unavailable", "deadline-exceeded", "failed-precondition", "resource-exhausted", "not-found"]) {
    const issue = describeGenreSaveError({ code }, "write");
    assert.equal(issue.code, code);
    assert.ok(issue.message.length > 45, code);
  }
});

test("unknown errors distinguish writes from unverified cloud readbacks", () => {
  const write = describeGenreSaveError(new Error("private detail"), "write");
  const verify = describeGenreSaveError(new Error("private detail"), "verify");
  assert.equal(write.code, "unverified");
  assert.equal(verify.code, "unverified");
  assert.notEqual(write.message, verify.message);
  assert.doesNotMatch(write.message + verify.message, /private detail/);
});
