/**
 * Check an ordered genre selection against the canonical profile value.
 * Genre order matters because Home renders rails in the stored order.
 * Deliberately do not coerce string IDs or silently drop unknown entries.
 */
export function genrePreferencesMatch(actual: unknown, expected: readonly number[]): boolean {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) =>
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value === expected[index]
    );
}
