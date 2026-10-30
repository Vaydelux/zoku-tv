import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  hashLocalCredential,
  purgeProfileData,
  getDocRef,
   getCollectionRef,
  setDocument,
  getDocument,
  listenToOrderedCollection,
  signupWithEmail,
  loginWithEmail,
} from "./firebase";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  (globalThis as any).window = globalThis;
  (globalThis as any).localStorage = mockStorage;
  return store;
}

describe("Security, Credential Hashing, & Profile Isolation (Phase 1)", () => {
  let storageMap: Map<string, string>;

  beforeEach(() => {
    storageMap = installMemoryLocalStorage();
  });

  it("hashes local credentials with salt and never stores plaintext passwords", async () => {
    const hashA = await hashLocalCredential("user@example.com", "MySecretPass!99", "salt_1");
    const hashB = await hashLocalCredential("user@example.com", "MySecretPass!99", "salt_1");
    const hashDiffSalt = await hashLocalCredential("user@example.com", "MySecretPass!99", "salt_2");

    assert.equal(hashA, hashB);
    assert.notEqual(hashA, hashDiffSalt);
    assert.equal(hashA.includes("MySecretPass!99"), false);

    await signupWithEmail("viewer@zoku.tv", "SuperSecret123", "Alex");
    const rawUsers = storageMap.get("zoku_registered_users") || "";
    assert.equal(rawUsers.includes("SuperSecret123"), false, "Plaintext password must never be stored");

    const parsedUsers = JSON.parse(rawUsers);
    assert.equal(parsedUsers.length, 1);
    assert.ok(parsedUsers[0].passwordHash);
    assert.ok(parsedUsers[0].salt);
    assert.equal(parsedUsers[0].password, undefined);

    const loggedIn = await loginWithEmail("viewer@zoku.tv", "SuperSecret123");
    assert.equal(loggedIn.user.email, "viewer@zoku.tv");

    await assert.rejects(
      () => loginWithEmail("viewer@zoku.tv", "WrongPassword"),
      /Invalid email or password/
    );
  });

  it("purges all subcollections and local keys for a deleted profile without touching sibling profiles", async () => {
    const uid = "user_isolation_1";
    const p1 = "profile_alpha";
    const p2 = "profile_beta";

    await setDocument(getDocRef(`users/${uid}/profiles/${p1}/watchlist`, "movie_100"), {
      media_type: "movie",
      tmdbId: 100,
      title: "Alpha Movie",
    });
    await setDocument(getDocRef(`users/${uid}/profiles/${p1}/continueWatching`, "movie_100"), {
      media_type: "movie",
      tmdbId: 100,
      title: "Alpha Movie",
      last_watched_at: "2026-10-30T10:00:00Z",
    });
    await setDocument(getDocRef(`users/${uid}/profiles/${p2}/watchlist`, "movie_200"), {
      media_type: "movie",
      tmdbId: 200,
      title: "Beta Movie",
    });

    localStorage.setItem(`zoku_search_history_${uid}_${p1}`, JSON.stringify(["dune"]));
    localStorage.setItem(`zoku_search_history_${uid}_${p2}`, JSON.stringify(["arcane"]));

    await purgeProfileData(uid, p1);

    const p1WatchlistSnap = await getDocument(
      getDocRef(`users/${uid}/profiles/${p1}/watchlist`, "movie_100")
    );
    const p1ContinueSnap = await getDocument(
      getDocRef(`users/${uid}/profiles/${p1}/continueWatching`, "movie_100")
    );
    const p2WatchlistSnap = await getDocument(
      getDocRef(`users/${uid}/profiles/${p2}/watchlist`, "movie_200")
    );

    assert.equal(p1WatchlistSnap.exists(), false);
    assert.equal(p1ContinueSnap.exists(), false);
    assert.equal(p2WatchlistSnap.exists(), true);
    assert.equal(localStorage.getItem(`zoku_search_history_${uid}_${p1}`), null);
    assert.equal(localStorage.getItem(`zoku_search_history_${uid}_${p2}`), '["arcane"]');
  });

  it("notifies ordered collection listeners live when documents are written", async () => {
    const colRef = getCollectionRef("users/u1/profiles/p1/continueWatching");
    const snapshots: Array<string[]> = [];

    const unsubscribe = listenToOrderedCollection(
      colRef,
      { orderByField: "last_watched_at", direction: "desc" },
      (snap) => {
        snapshots.push(snap.docs.map((d: any) => d.id));
      }
    );

    await setDocument(getDocRef("users/u1/profiles/p1/continueWatching", "movie_1"), {
      title: "First",
      last_watched_at: "2026-10-30T01:00:00Z",
    });
    await setDocument(getDocRef("users/u1/profiles/p1/continueWatching", "movie_2"), {
      title: "Second",
      last_watched_at: "2026-10-30T02:00:00Z",
    });

    unsubscribe();
    const latest = snapshots[snapshots.length - 1];
    assert.deepEqual(latest, ["movie_2", "movie_1"]);
  });

  it("validates firestore.rules includes strict ownership and schema validators", () => {
    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    const rulesContent = fs.readFileSync(rulesPath, "utf8");

    assert.ok(rulesContent.includes("function isOwner(userId)"));
    assert.ok(rulesContent.includes("appearancePreference in ['dark', 'light']"));
    assert.ok(rulesContent.includes("function validWatchHistoryItem()"));
    assert.ok(rulesContent.includes("function validEpisodeProgressItem()"));
    assert.ok(rulesContent.includes("'creator' in data"));
    assert.ok(rulesContent.includes("'genres' in data"));
  });
});

