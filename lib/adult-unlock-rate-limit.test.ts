import test from "node:test";
import assert from "node:assert/strict";
import { clearAdultUnlockFailures, isAdultUnlockLimited, recordAdultUnlockFailure } from "./adult-unlock-rate-limit";

test("adult content password guesses are throttled and reset after cooldown", () => {
  const client = "test-one";
  const start = 1_000_000;
  clearAdultUnlockFailures(client);
  for (let i = 0; i < 4; i++) {
    recordAdultUnlockFailure(client, start);
    assert.equal(isAdultUnlockLimited(client, start), 0);
  }
  recordAdultUnlockFailure(client, start);
  assert.equal(isAdultUnlockLimited(client, start), 900);
  assert.equal(isAdultUnlockLimited(client, start + 900_000), 0);
  clearAdultUnlockFailures(client);
});

test("password attempt buckets are independent", () => {
  const a = "test-bucket-a", b = "test-bucket-b";
  clearAdultUnlockFailures(a);
  clearAdultUnlockFailures(b);
  for (let i = 0; i < 5; i++) recordAdultUnlockFailure(a, 2_000_000);
  assert.ok(isAdultUnlockLimited(a, 2_000_000) > 0);
  assert.equal(isAdultUnlockLimited(b, 2_000_000), 0);
  clearAdultUnlockFailures(a);
  assert.equal(isAdultUnlockLimited(a, 2_000_000), 0);
});
