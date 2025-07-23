// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-QI8a83CGafYjvoMfhkc4JOQko1H2A1Y",
  authDomain: "football-squares-3694e.firebaseapp.com",
  projectId: "football-squares-3694e",
  storageBucket: "football-squares-3694e.firebasestorage.app",
  messagingSenderId: "546147505501",
  appId: "1:546147505501:web:b1a78f09dabf513f0dc4b4",
  measurementId: "G-71SZ008KQB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
