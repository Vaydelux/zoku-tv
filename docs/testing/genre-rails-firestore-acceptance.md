# Genre rail preference persistence acceptance

## What the application verifies

After a signed-in user saves `Home Genre Rails`, the app writes the exact selected genre IDs to `users/{uid}/profiles/{profileId}` and reads the same document back with Firebase `getDocFromServer`. A save is labelled **verified in Firestore** only if the network-backed document contains the exact ordered list.

This avoids treating a local cache, an optimistic Firebase snapshot, or a successful UI animation as proof of cloud persistence.

A failed write raises a save error. If a write succeeds but server readback fails, the UI reports **verification failed** rather than claiming the cloud write succeeded. In demo mode, the UI explicitly says the save was local, not Firestore.

## Manual production acceptance (requires the user's own account)

1. Sign in at `/login` using the normal Firebase account, **not** Quick Local Demo.
2. Choose a profile and open `/settings?section=genre-rails`.
3. Change one or two genres, then select **Save Rail Preferences**.
4. Require this exact success message: `Genre rail preferences verified in Firestore.`
5. Reload Settings; verify the selected checkboxes and count are retained.
6. Optionally sign in with the same account and profile on another browser/device.
7. If confirmation is missing, check browser console for `Genre preference persistence verification failed` and Firestore Rules for access to `users/{uid}/profiles/{profileId}`. Do not share authentication tokens or passwords.

## Automated tests

- `lib/genre-preferences.test.ts` validates exact ordered ID readback and rejects mismatches.
- `scripts/rc-browser-smoke.mjs` exercises the local-demo write, readback, reload and UI disclosure. **It does not use a real authenticated Firebase account**.

## Limits

The new mechanism verifies persistence for the particular save request in an authenticated session; it does not prove that content services, streaming embeds, or physical Android TV playback work. The Firestore server must be reachable and its authenticated read rules must allow access to the user's own profile.
