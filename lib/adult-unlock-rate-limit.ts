/**
 * Best-effort per-instance throttling for password guesses. Instances do not share
 * state. Deploy a distributed limiter / WAF for cross-instance enforcement.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_KEYS = 2000;
type Attempt = { failures: number; resetAt: number };
const attempts = new Map<string, Attempt>();

function current(key: string, now: number): Attempt {
  const record = attempts.get(key);
  if (record && now < record.resetAt) return record;
  return { failures: 0, resetAt: now + WINDOW_MS };
}

export function isAdultUnlockLimited(key: string, now = Date.now()): number {
  const record = current(key, now);
  return record.failures >= MAX_FAILURES ? Math.max(1, Math.ceil((record.resetAt - now) / 1000)) : 0;
}

export function recordAdultUnlockFailure(key: string, now = Date.now()): void {
  if (attempts.size >= MAX_KEYS && !attempts.has(key)) {
    for (const [item, record] of attempts) {
      if (record.resetAt <= now) attempts.delete(item);
    }
    if (attempts.size >= MAX_KEYS) attempts.delete(attempts.keys().next().value!);
  }
  const record = current(key, now);
  attempts.set(key, { failures: record.failures + 1, resetAt: record.resetAt });
}

export function clearAdultUnlockFailures(key: string): void {
  attempts.delete(key);
}
