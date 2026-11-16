/**
 * Present actionable, safe Firestore profile-save diagnostics.
 * Firebase error strings may contain internal details; expose only known
 * error codes and curated messages, never raw error.message or credentials.
 */
export type SavePhase = "write" | "verify";

export function describeGenreSaveError(
  error: unknown,
  phase: SavePhase,
): { code: string; message: string } {
  const rawCode = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  const code = rawCode.replace(/^firestore\//, "");
  switch (code) {
    case "permission-denied":
      return {
        code,
        message: "Firestore denied this profile update. Check the deployed Firestore security rules and whether this profile belongs to your signed-in account.",
      };
    case "unauthenticated":
      return { code, message: "Your Firebase session is not authenticated. Sign in again with your normal account." };
    case "unavailable":
    case "deadline-exceeded":
      return { code, message: "Cloud Firestore is unreachable. Reconnect and verify the profile before attempting another save." };
    case "failed-precondition":
      return { code, message: "Firestore rejected a required condition. Check the selected Firebase project, profile, and rules." };
    case "resource-exhausted":
      return { code, message: "Firestore usage or request limits were reached. Check Firebase Console usage and quotas." };
    case "not-found":
      return { code, message: "Your profile document was not found in Firestore. Reopen the profile picker and check its cloud status." };
    default:
      return {
        code: code || "unverified",
        message: phase === "verify"
          ? "The save may have reached Firestore, but the server read-back did not confirm it. Refresh cloud status before retrying."
          : "Cloud save failed. Check Firebase Cloud Status below for the specific connectivity or security issue.",
      };
  }
}
