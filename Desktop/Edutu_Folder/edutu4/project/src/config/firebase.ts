import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { validateEnvironment, logSecurityEvent } from "../utils/security";

// Check if we're in development mode and allow running without Firebase
const isDevelopment = import.meta.env.DEV;
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Default configuration for development mode
const defaultConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};

let app: any = null;
let auth: any = null;
let db: any = null;
let analytics: any = null;

if (hasFirebaseConfig) {
  // Validate environment variables before initializing Firebase
  try {
    validateEnvironment();
  } catch (error) {
    logSecurityEvent('firebase_config_error', { error: (error as Error).message });
    if (!isDevelopment) {
      throw error;
    }
  }

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);

  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app);

  // Initialize Analytics (optional)
  analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
} else if (isDevelopment) {
  // In development mode without Firebase config, create mock objects
  console.warn('🚨 Running in development mode without Firebase configuration. Some features may not work.');
  
  // Create mock Firebase objects for development
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
    signOut: () => Promise.reject(new Error('Firebase not configured')),
    onAuthStateChanged: () => () => {}
  };
  
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: () => false, data: () => null }),
        set: () => Promise.reject(new Error('Firebase not configured')),
        update: () => Promise.reject(new Error('Firebase not configured')),
        delete: () => Promise.reject(new Error('Firebase not configured'))
      }),
      add: () => Promise.reject(new Error('Firebase not configured')),
      where: () => ({
        get: () => Promise.resolve({ empty: true, docs: [] })
      })
    })
  };
  
  analytics = null;
} else {
  throw new Error('Firebase configuration is required in production mode');
}

export { auth, db, analytics };
export default app;