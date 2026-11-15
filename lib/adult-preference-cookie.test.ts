import assert from "node:assert/strict";
import test from "node:test";
import { ADULT_COOKIE_NAME, ADULT_PREFERENCE_TTL_SECONDS, adultFilterEnabledForCookie } from "./server/adult-session";

test("adult titles remain filtered by default and for unknown or legacy signed cookies", () => {
  assert.equal(ADULT_COOKIE_NAME, "zoku_adult_filter_unlock");
  for (const raw of [undefined, "", "off", "false", "1", "on.evil", "123456.abcdef", "ON"]) {
    assert.equal(adultFilterEnabledForCookie(raw), true, String(raw));
  }
});

test("only explicit opt-in turns filtering off, without a server password", () => {
  assert.equal(adultFilterEnabledForCookie("on"), false);
  assert.equal(ADULT_PREFERENCE_TTL_SECONDS, 30 * 24 * 60 * 60);
});
