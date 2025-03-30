import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
declare const app: FirebaseApp;
declare const auth: Auth;
declare const db: Firestore;
export { app, auth, db };