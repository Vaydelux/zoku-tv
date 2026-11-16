# Genre Rails: Cloud save troubleshooting and release gate

## Current code / known failure modes

- The browser sends `updateDoc` to the existing document `users/{auth.uid}/profiles/{profileId}`; it must be signed in as its owner.
- A successful write is followed by `getDocFromServer`. Only an exact ordered match produces **Genre rail preferences verified in Firestore.**
- The repo's former `validProfileFields()` rule evaluated **every persisted profile field** on an update, including untouched values written by earlier versions. That could produce `permission-denied` for a valid Genre Rails edit.
- The revised Firestore rule validates fields in `request.resource.data.diff(resource.data).affectedKeys()` and still checks owner UID. Existing malformed historical values are not implicitly changed or approved on CREATE.
- The old session startup could apply a stale prefetch after an `onSnapshot` callback. Newer live snapshots now take precedence.
- Firebase Cloud Status only checks some reads and a search-history write: this does **not** test profile-write permission. Saving this preference performs the required write + server readback.

## Important: Publishing this Next.js code is not publishing Firestore rules

Vercel deploys the website; the Firebase project's **deployed Firestore rules** are a separate release dependency. If the deployed rules are stale, a new website build alone cannot fix `permission-denied`.

The `.firebaserc` alias `prod` points to Firebase project `zoku-tv`. From an authenticated local environment with Firebase CLI installed, after reviewing the final rules and confirming the project:

```sh
npm run firebase:deploy:rules
```

This now uses `--project prod` explicitly. Do **not** deploy the rules to the wrong project; do not paste Firebase credentials into chat, GitHub comments, or build logs.

After rules deployment:

1. Sign into the actual Firebase account at `https://zoku-tv.vercel.app/login`, select your profile and open `/settings?section=genre-rails`.
2. Toggle one genre, select Save, and require **Genre rail preferences verified in Firestore.**
3. Refresh and confirm the selection remains. Check a second device using the same account if available.
4. If save fails, a persistent error below Save shows a Firebase code and next action:
   - `permission-denied`: verify deployed rules, project, signed-in UID and ownership.
   - `not-found`: the locally remembered profile no longer exists in the cloud. Re-select / recreate a cloud profile.
   - `unauthenticated`: reauthenticate using the normal account instead of local demo.
   - `unavailable`: check connectivity and retry after confirming current state.
   - `verify-mismatch`: a server readback disagreed with the requested ordered IDs; don't claim success.
5. For a new browser, make sure the selected profile and Catalog Mode (TMDB for movie/TV genres) match the saved profile.

## Qualification boundary

Unit tests in `lib/firestore-profile-rules.test.ts` are **structural regression checks**, not a rules evaluator. Browser acceptance uses local-demo mode and cannot confirm live Firestore permissions. Full qualification also requires a Firebase emulator rules test or the authenticated production save above. Publishing this repo's rules file in GitHub is not proof that the Firebase Console has received it.
