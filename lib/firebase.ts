// Zoku TV - Firebase client module with automatic local/offline fallback
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasRealConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// --- Firebase App + Auth initialization ---
let app: FirebaseApp | undefined;
let realAuth: Auth | null = null;
let realDb: Firestore | null = null;

/** Google OAuth provider — null when Firebase env vars are not configured */
export let googleProvider: GoogleAuthProvider | null = null;

if (hasRealConfig) {
  try {
    // 1. Initialize Firebase App
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // 2. Initialize Firebase Auth & Google provider
    realAuth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    // Firestore for profiles, watchlist, etc.
    realDb = getFirestore(app);

    console.log("Zoku TV: Firebase initialized successfully with cloud configuration.");
  } catch (error) {
    console.error("Zoku TV: Failed to initialize real Firebase:", error);
    googleProvider = null;
  }
}

// 3. Export Auth instance (real Firebase Auth, or local mock when offline)

interface MockAuth {
  currentUser: MockUser | null;
}

const mockAuth: MockAuth = { currentUser: null };

export const auth: Auth | MockAuth = realAuth ?? mockAuth;
// This replicates the precise behavior of Auth and Firestore using localStorage
// so that the application is 100% interactive and functional even when offline/not provisioned.

interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const STORAGE_KEY_AUTH = "zoku_local_auth_user";
const STORAGE_KEY_DB = "zoku_local_db";

const getLocalUser = (): MockUser | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY_AUTH);
  return data ? JSON.parse(data) : null;
};

const setLocalUser = (user: MockUser | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_AUTH);
  }
};

const getLocalDb = (): Record<string, any> => {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem(STORAGE_KEY_DB);
  return data ? JSON.parse(data) : {};
};

const setLocalDb = (dbData: Record<string, any>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(dbData));
};

// Store onAuthStateChanged listeners
const authListeners: Array<(user: any) => void> = [];
// Store Firestore listeners
const dbListeners: Record<string, Array<(snapshot: any) => void>> = {};

const triggerAuthChange = (user: any) => {
  authListeners.forEach(cb => cb(user));
};

const triggerDbChange = (path: string) => {
  if (dbListeners[path]) {
    const dbData = getLocalDb();
    const docData = dbData[path] || null;
    const snap = {
      exists: () => !!docData,
      data: () => docData,
      id: path.split("/").pop(),
    };
    dbListeners[path].forEach(cb => cb(snap));
  }
  
  // Also trigger list listeners (parent path)
  const parts = path.split("/");
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join("/");
    if (dbListeners[parentPath]) {
      const dbData = getLocalDb();
      const results: any[] = [];
      Object.entries(dbData).forEach(([key, value]) => {
        if (key.startsWith(parentPath + "/") && key.split("/").length === parts.length) {
          results.push({
            id: key.split("/").pop(),
            data: () => value,
            exists: () => true
          });
        }
      });
      const querySnap = {
        docs: results,
        forEach: (cb: any) => results.forEach(cb),
        empty: results.length === 0,
        size: results.length
      };
      dbListeners[parentPath].forEach(cb => cb(querySnap));
    }
  }
};

// === EXPORTED FIRESTORE API ===

// Initialize current user from localStorage on load if in client (mock mode only)
if (!realAuth && typeof window !== "undefined") {
  mockAuth.currentUser = getLocalUser();
}

export const db = realDb || {};

export const firebaseProjectId = firebaseConfig.projectId || null;
export const isCloudFirebaseConfigured = hasRealConfig;
export const isCloudFirebaseActive = () => !!(hasRealConfig && realDb && realAuth);

export type FirebaseHealthState =
  | "checking"
  | "not_configured"
  | "offline_mode"
  | "network_offline"
  | "connected"
  | "rules_ok"
  | "rules_error"
  | "index_error";

export type FirebaseHealthResult = {
  state: FirebaseHealthState;
  message: string;
  details?: string;
  checkedAt: string;
  projectId: string | null;
};

export async function runFirestoreHealthCheck(
  userId: string,
  profileId?: string
): Promise<FirebaseHealthResult> {
  const checkedAt = new Date().toISOString();

  if (!hasRealConfig) {
    return {
      state: "not_configured",
      message: "Firebase is not configured. Data stays on this device only.",
      checkedAt,
      projectId: null,
    };
  }

  if (!realDb) {
    return {
      state: "offline_mode",
      message: "Local offline mode is active. Cloud Firestore is unavailable.",
      checkedAt,
      projectId: firebaseProjectId,
    };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      state: "network_offline",
      message: "Browser is offline. Cloud sync is paused until you reconnect.",
      checkedAt,
      projectId: firebaseProjectId,
    };
  }

  try {
    await getDocs(collection(realDb, `users/${userId}/profiles`));

    if (profileId) {
      const historyRef = doc(realDb, `users/${userId}/profiles/${profileId}/searchHistory/list`);
      const historySnap = await getDoc(historyRef);
      const history = historySnap.exists() ? historySnap.data()?.history ?? [] : [];
      await setDoc(
        historyRef,
        { history, updatedAt: checkedAt },
        { merge: true }
      );

      const watchlistQuery = query(
        collection(realDb, `users/${userId}/profiles/${profileId}/watchlist`),
        orderBy("added_at", "desc"),
        limit(1)
      );
      await getDocs(watchlistQuery);

      const continueWatchingQuery = query(
        collection(realDb, `users/${userId}/profiles/${profileId}/continueWatching`),
        orderBy("last_watched_at", "desc"),
        limit(1)
      );
      await getDocs(continueWatchingQuery);
    }

    return {
      state: "rules_ok",
      message: "Cloud connected. Security rules and indexes are working.",
      checkedAt,
      projectId: firebaseProjectId,
    };
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    const code = firebaseError.code ?? "";
    const details = firebaseError.message;

    if (code === "permission-denied") {
      return {
        state: "rules_error",
        message: "Firestore rules blocked this account. Deploy firestore.rules from this repo.",
        details,
        checkedAt,
        projectId: firebaseProjectId,
      };
    }

    if (code === "failed-precondition") {
      return {
        state: "index_error",
        message: "A Firestore index is missing or still building. Run: npm run firebase:deploy:indexes",
        details,
        checkedAt,
        projectId: firebaseProjectId,
      };
    }

    return {
      state: "connected",
      message: "Firebase is connected, but the health check could not finish.",
      details,
      checkedAt,
      projectId: firebaseProjectId,
    };
  }
}

export const oAuthEnabled = hasRealConfig && !!realAuth && !!googleProvider;

export { GoogleAuthProvider };

export async function loginWithEmail(email: string, password: string) {
  if (realAuth) {
    return signInWithEmailAndPassword(realAuth, email, password);
  }
  // Mock login
  const users = JSON.parse(localStorage.getItem("zoku_registered_users") || "[]");
  const match = users.find((u: any) => u.email === email && u.password === password);
  if (!match) {
    throw new Error("Invalid email or password");
  }
  const user = { uid: match.uid, email: match.email, displayName: match.name || email.split("@")[0], photoURL: null };
  mockAuth.currentUser = user;
  setLocalUser(user);
  triggerAuthChange(user);
  return { user };
}

export async function signupWithEmail(email: string, password: string, name: string) {
  if (realAuth) {
    const cred = await createUserWithEmailAndPassword(realAuth, email, password);
    return cred;
  }
  // Mock signup
  const users = JSON.parse(localStorage.getItem("zoku_registered_users") || "[]");
  if (users.some((u: any) => u.email === email)) {
    throw new Error("Email already exists");
  }
  const uid = "mock_uid_" + Math.random().toString(36).substr(2, 9);
  const newUser = { uid, email, password, name };
  users.push(newUser);
  localStorage.setItem("zoku_registered_users", JSON.stringify(users));

  const user = { uid, email, displayName: name, photoURL: null };
  mockAuth.currentUser = user;
  setLocalUser(user);
  triggerAuthChange(user);
  return { user };
}

async function mockLoginWithGoogle() {
  const uid = "google_mock_" + Math.random().toString(36).substr(2, 9);
  const user = {
    uid,
    email: "google.user@example.com",
    displayName: "Google Streamer",
    photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Google",
  };
  mockAuth.currentUser = user;
  setLocalUser(user);
  triggerAuthChange(user);
  return { user };
}

/** Google sign-in popup — uses Firebase when configured, local mock otherwise. */
export function signInWithGoogle(): Promise<UserCredential | { user: MockUser }> {
  if (realAuth && googleProvider) {
    return signInWithPopup(realAuth, googleProvider);
  }
  return mockLoginWithGoogle();
}

export async function loginWithGoogle() {
  return signInWithGoogle();
}

export async function logout() {
  if (realAuth) {
    return signOut(realAuth);
  }
  mockAuth.currentUser = null;
  setLocalUser(null);
  triggerAuthChange(null);
}

export function onAuthChanged(callback: (user: any) => void) {
  if (realAuth) {
    return onAuthStateChanged(realAuth, callback);
  }
  authListeners.push(callback);
  setTimeout(() => {
    callback(mockAuth.currentUser);
  }, 0);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx !== -1) authListeners.splice(idx, 1);
  };
}

// === FIRESTORE API SIMULATION ===

export function getDocRef(path: string, ...segments: string[]) {
  const fullPath = [path, ...segments].filter(Boolean).join("/");
  if (realDb) {
    return doc(realDb, fullPath);
  }
  return { type: "doc", path: fullPath };
}

export function getCollectionRef(path: string, ...segments: string[]) {
  const fullPath = [path, ...segments].filter(Boolean).join("/");
  if (realDb) {
    return collection(realDb, fullPath);
  }
  return { type: "collection", path: fullPath };
}

export async function setDocument(docRef: any, data: any) {
  if (realDb) {
    return setDoc(docRef, data, { merge: true });
  }
  const dbData = getLocalDb();
  dbData[docRef.path] = { ...dbData[docRef.path], ...data };
  setLocalDb(dbData);
  triggerDbChange(docRef.path);
}

export async function getDocument(docRef: any) {
  if (realDb) {
    return getDoc(docRef);
  }
  const dbData = getLocalDb();
  const docData = dbData[docRef.path] || null;
  return {
    exists: () => !!docData,
    data: () => docData,
    id: docRef.path.split("/").pop(),
  };
}

export async function updateDocument(docRef: any, data: any) {
  if (realDb) {
    return updateDoc(docRef, data);
  }
  const dbData = getLocalDb();
  if (!dbData[docRef.path]) {
    throw new Error(`Document does not exist: ${docRef.path}`);
  }
  dbData[docRef.path] = { ...dbData[docRef.path], ...data };
  setLocalDb(dbData);
  triggerDbChange(docRef.path);
}

export async function deleteDocument(docRef: any) {
  if (realDb) {
    return deleteDoc(docRef);
  }
  const dbData = getLocalDb();
  delete dbData[docRef.path];
  setLocalDb(dbData);
  triggerDbChange(docRef.path);
}

export function listenToDoc(docRef: any, callback: (snapshot: any) => void) {
  if (realDb) {
    return onSnapshot(docRef, callback);
  }
  const path = docRef.path;
  if (!dbListeners[path]) dbListeners[path] = [];
  dbListeners[path].push(callback);

  // Send initial value
  const dbData = getLocalDb();
  const docData = dbData[path] || null;
  setTimeout(() => {
    callback({
      exists: () => !!docData,
      data: () => docData,
      id: path.split("/").pop(),
    });
  }, 0);

  return () => {
    dbListeners[path] = dbListeners[path].filter(cb => cb !== callback);
  };
}

/** One-shot collection fetch — faster first paint than waiting only on onSnapshot */
export async function getCollectionDocs(collectionRef: any) {
  if (realDb) {
    return getDocs(collectionRef);
  }
  const path = collectionRef.path as string;
  const dbData = getLocalDb();
  const results: any[] = [];
  Object.entries(dbData).forEach(([key, value]) => {
    if (key.startsWith(path + "/") && key.split("/").length === path.split("/").length + 1) {
      results.push({
        id: key.split("/").pop(),
        data: () => value,
        exists: () => true,
      });
    }
  });
  return {
    docs: results,
    forEach: (cb: any) => results.forEach(cb),
    empty: results.length === 0,
    size: results.length,
  };
}

export function listenToCollection(collectionRef: any, callback: (snapshot: any) => void) {
  if (realDb) {
    return onSnapshot(collectionRef, callback);
  }
  const path = collectionRef.path;
  if (!dbListeners[path]) dbListeners[path] = [];
  dbListeners[path].push(callback);

  // Send initial query snapshot
  setTimeout(() => {
    const dbData = getLocalDb();
    const results: any[] = [];
    Object.entries(dbData).forEach(([key, value]) => {
      if (key.startsWith(path + "/") && key.split("/").length === path.split("/").length + 1) {
        results.push({
          id: key.split("/").pop(),
          data: () => value,
          exists: () => true
        });
      }
    });
    callback({
      docs: results,
      forEach: (cb: any) => results.forEach(cb),
      empty: results.length === 0,
      size: results.length
    });
  }, 0);

  return () => {
    dbListeners[path] = dbListeners[path].filter(cb => cb !== callback);
  };
}

type OrderedCollectionOptions = {
  orderByField: string;
  direction?: "asc" | "desc";
  limitTo?: number;
};

export function listenToOrderedCollection(
  collectionRef: any,
  options: OrderedCollectionOptions,
  callback: (snapshot: any) => void
) {
  if (realDb) {
    const direction = options.direction === "asc" ? "asc" : "desc";
    const collectionQuery = options.limitTo
      ? query(collectionRef, orderBy(options.orderByField, direction), limit(options.limitTo))
      : query(collectionRef, orderBy(options.orderByField, direction));
    return onSnapshot(collectionQuery, callback);
  }

  const path = collectionRef.path;
  const listenerKey = `${path}?orderBy=${options.orderByField}&dir=${options.direction ?? "desc"}`;
  if (!dbListeners[listenerKey]) dbListeners[listenerKey] = [];
  dbListeners[listenerKey].push(callback);

  setTimeout(() => {
    const dbData = getLocalDb();
    const results: any[] = [];
    Object.entries(dbData).forEach(([key, value]) => {
      if (key.startsWith(path + "/") && key.split("/").length === path.split("/").length + 1) {
        results.push({
          id: key.split("/").pop(),
          data: () => value,
          exists: () => true,
        });
      }
    });

    const direction = options.direction === "asc" ? 1 : -1;
    results.sort((a, b) => {
      const aValue = a.data()?.[options.orderByField] ?? "";
      const bValue = b.data()?.[options.orderByField] ?? "";
      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });

    const limitedResults = options.limitTo ? results.slice(0, options.limitTo) : results;

    callback({
      docs: limitedResults,
      forEach: (cb: any) => limitedResults.forEach(cb),
      empty: limitedResults.length === 0,
      size: limitedResults.length,
    });
  }, 0);

  return () => {
    dbListeners[listenerKey] = dbListeners[listenerKey].filter((cb) => cb !== callback);
  };
}
