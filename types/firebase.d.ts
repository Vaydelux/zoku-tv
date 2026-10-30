declare module "firebase/app" {
  export interface FirebaseOptions {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
  }
  export interface FirebaseApp {
    name: string;
    options: FirebaseOptions;
  }
  export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
}

declare module "firebase/auth" {
  import type { FirebaseApp } from "firebase/app";
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }
  export interface UserCredential {
    user: User;
  }
  export interface Auth {
    currentUser: User | null;
  }
  export class GoogleAuthProvider {
    setCustomParameters(customOAuthParameters: Record<string, string>): this;
  }
  export function getAuth(app?: FirebaseApp): Auth;
  export function signInWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(
    auth: Auth,
    nextOrObserver: (user: User | null) => void
  ): () => void;
  export function signInWithPopup(
    auth: Auth,
    provider: GoogleAuthProvider
  ): Promise<UserCredential>;
}

declare module "firebase/firestore" {
  import type { FirebaseApp } from "firebase/app";
  export interface Firestore {}
  export interface DocumentReference<T = any> {
    id: string;
    path: string;
  }
  export interface CollectionReference<T = any> {
    id: string;
    path: string;
  }
  export interface Query<T = any> {}
  export interface QueryConstraint {}
  export interface DocumentSnapshot<T = any> {
    id: string;
    ref: DocumentReference<T>;
    exists(): boolean;
    data(): T | undefined;
  }
  export interface QueryDocumentSnapshot<T = any> extends DocumentSnapshot<T> {
    data(): T;
  }
  export interface QuerySnapshot<T = any> {
    docs: QueryDocumentSnapshot<T>[];
    empty: boolean;
    size: number;
    forEach(callback: (result: QueryDocumentSnapshot<T>) => void): void;
  }
  export function getFirestore(app?: FirebaseApp): Firestore;
  export function doc(
    firestore: Firestore,
    path: string,
    ...pathSegments: string[]
  ): DocumentReference;
  export function collection(
    firestore: Firestore,
    path: string,
    ...pathSegments: string[]
  ): CollectionReference;
  export function setDoc<T = any>(
    reference: DocumentReference<T>,
    data: T,
    options?: { merge?: boolean }
  ): Promise<void>;
  export function getDoc<T = any>(
    reference: DocumentReference<T>
  ): Promise<DocumentSnapshot<T>>;
  export function updateDoc<T = any>(
    reference: DocumentReference<T>,
    data: Partial<T> | Record<string, any>
  ): Promise<void>;
  export function deleteDoc<T = any>(reference: DocumentReference<T>): Promise<void>;
  export function getDocs<T = any>(
    query: CollectionReference<T> | Query<T>
  ): Promise<QuerySnapshot<T>>;
  export function onSnapshot<T = any>(
    reference: DocumentReference<T> | CollectionReference<T> | Query<T>,
    onNext: (snapshot: any) => void,
    onError?: (error: Error) => void
  ): () => void;
  export function query<T = any>(
    query: CollectionReference<T> | Query<T>,
    ...queryConstraints: QueryConstraint[]
  ): Query<T>;
  export function orderBy(
    fieldPath: string,
    directionStr?: "asc" | "desc"
  ): QueryConstraint;
  export function limit(limit: number): QueryConstraint;
}

