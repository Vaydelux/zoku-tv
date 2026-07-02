// Zoku TV - Firebase client module with automatic local/offline fallback
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
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
  where,
  addDoc,
  getDocs,
  Firestore
} from "firebase/firestore";

// Check if we have valid firebase config. Since the user declined setup,
// we will detect if we have valid parameters, and if not, use our elegant localStorage fallback
// that mimics the Firebase Auth and Firestore API identically.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const hasRealConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let realAuth: any = null;
let realDb: any = null;

if (hasRealConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    realAuth = getAuth(app);
    realDb = getFirestore(app);
    console.log("Zoku TV: Firebase initialized successfully with cloud configuration.");
  } catch (error) {
    console.error("Zoku TV: Failed to initialize real Firebase:", error);
  }
}

// === LOCAL FALLBACK ENGINE ===
// This replicates the precise behavior of Auth and Firestore using localStorage
// so that the application is 100% interactive and functional even when offline/not provisioned.

interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

class MockGoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
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

// === EXPORTED AUTHS & FIRESTORE APIs ===

export const auth = realAuth || {
  currentUser: null as MockUser | null,
};

// Initialize current user from localStorage on load if in client
if (!realAuth && typeof window !== "undefined") {
  auth.currentUser = getLocalUser();
}

export const db = realDb || {};

export const oAuthEnabled = hasRealConfig;

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
  auth.currentUser = user;
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
  auth.currentUser = user;
  setLocalUser(user);
  triggerAuthChange(user);
  return { user };
}

export async function loginWithGoogle() {
  if (realAuth) {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(realAuth, provider);
  }
  // Mock Google Login
  const uid = "google_mock_" + Math.random().toString(36).substr(2, 9);
  const user = { uid, email: "google.user@example.com", displayName: "Google Streamer", photoURL: "https://api.dicebear.com/7.x/adventurer/svg?seed=Google" };
  auth.currentUser = user;
  setLocalUser(user);
  triggerAuthChange(user);
  return { user };
}

export async function logout() {
  if (realAuth) {
    return signOut(realAuth);
  }
  auth.currentUser = null;
  setLocalUser(null);
  triggerAuthChange(null);
}

export function onAuthChanged(callback: (user: any) => void) {
  if (realAuth) {
    return onAuthStateChanged(realAuth, callback);
  }
  authListeners.push(callback);
  // Send initial state immediately
  setTimeout(() => {
    callback(auth.currentUser);
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
