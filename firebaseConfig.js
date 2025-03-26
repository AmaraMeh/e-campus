// firebaseConfig.js (or .ts)
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence // Correct import for v9+
} from "firebase/auth"; // Import directly from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration - MAKE SURE THESE ARE CORRECT
const firebaseConfig = {
    apiKey: "AIzaSyB5XYqWKhHdiVDXJx4iOwtpxD8eUCPRfKU", // USE YOUR ACTUAL KEY
    authDomain: "universite-de-bejaia-547fc.firebaseapp.com",
    projectId: "universite-de-bejaia-547fc",
    storageBucket: "universite-de-bejaia-547fc.appspot.com",
    messagingSenderId: "517622731583",
    appId: "1:517622731583:web:25453d5e01226585bf798a",
    measurementId: "G-SQ0WWSCS7B"
};

let app;
let auth: ReturnType<typeof getAuth>; // Add type hint for TypeScript if using TS
let db;

try {
  if (!getApps().length) {
    // Initialize Firebase App
    app = initializeApp(firebaseConfig);

    // Initialize Auth with React Native Persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
      // No need for platform specific checks here, this handles it
    });

    // Initialize other services as needed
    db = getFirestore(app);

    console.log("Firebase initialized successfully with RN Persistence!");

  } else {
    app = getApp(); // Get the default app if already initialized
    auth = getAuth(app); // Get auth instance
    db = getFirestore(app); // Get Firestore instance
    console.log("Firebase already initialized.");
  }
} catch (error) {
    console.error("Firebase initialization error:", error);
    // Assign null or rethrow if initialization is critical
    app = null; // Or handle more gracefully
    auth = null;
    db = null;
}

// Export the instances (handle potential null if initialization failed)
export { app, auth, db };