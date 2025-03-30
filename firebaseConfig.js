// firebaseConfig.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"; // Combine imports
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence, // Correct import
  Auth // Import Auth type
} from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from "firebase/firestore"; // Import Firestore type
import { getStorage, FirebaseStorage } from "firebase/storage"; // Import Storage

// Your web app's Firebase configuration - MAKE SURE THESE ARE CORRECT
// CONSIDER USING ENVIRONMENT VARIABLES FOR SENSITIVE KEYS (apiKey)
const firebaseConfig = {
    apiKey: "AIzaSyB5XYqWKhHdiVDXJx4iOwtpxD8eUCPRfKU", // USE YOUR ACTUAL KEY
    authDomain: "universite-de-bejaia-547fc.firebaseapp.com",
    projectId: "universite-de-bejaia-547fc",
    storageBucket: "universite-de-bejaia-547fc.appspot.com",
    messagingSenderId: "517622731583",
    appId: "1:517622731583:web:25453d5e01226585bf798a",
    measurementId: "G-SQ0WWSCS7B" // Optional
};

// Declare variables with types, initialize later
let app: FirebaseApp;
let authInstance: Auth; // Use a different name to avoid conflict with 'auth' from import
let dbInstance: Firestore; // Use a different name
let storageInstance: FirebaseStorage; // Use a different name

try {
  // Check if Firebase App has already been initialized
  if (!getApps().length) {
    // Initialize Firebase App
    app = initializeApp(firebaseConfig);
    console.log("Firebase App Initialized.");

    // Initialize Auth with React Native Persistence
    // Use initializeAuth for persistence setup
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log("Firebase Auth Initialized with RN Persistence.");

    // Initialize Firestore
    dbInstance = getFirestore(app);
    console.log("Firestore Initialized.");

    // Initialize Storage
    storageInstance = getStorage(app);
    console.log("Firebase Storage Initialized.");

  } else {
    // Get the default app if already initialized
    app = getApp();
    console.log("Firebase already initialized, getting existing App.");

    // Get existing instances (safer than re-initializing)
    // Use getAuth() without persistence options if already initialized
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app); // Get storage instance
  }
} catch (error) {
    console.error("FIREBASE INITIALIZATION ERROR:", error);
    // Handle initialization error appropriately
    // Option 1: Throw error to halt app startup if Firebase is critical
    throw new Error("Failed to initialize Firebase. App cannot start.");
    // Option 2: Assign null/dummy objects and let parts of the app fail gracefully (more complex)
    // app = null as any; // Or some dummy app object
    // authInstance = null as any;
    // dbInstance = null as any;
    // storageInstance = null as any;
}

// Export the initialized instances
// Using different names avoids shadowing the imports from 'firebase/*'
export { app, authInstance as auth, dbInstance as db, storageInstance as storage };