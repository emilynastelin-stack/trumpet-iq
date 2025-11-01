// firebase.js - Using npm Firebase package
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously as firebaseSignInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyC8VDmCr_pfQLS6J7PCwdyf-Y6YSYXjLD8",
  authDomain: "trumpet-iq.firebaseapp.com",
  projectId: "trumpet-iq",
  storageBucket: "trumpet-iq.firebasestorage.app",
  messagingSenderId: "836505918959",
  appId: "1:836505918959:web:54e5fdadf41edd93892a1a",
  measurementId: "G-CMSETK0GLG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let analytics = null;

// Analytics may not work in all environments
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn('Firebase Analytics not available:', e);
}

// Helper function for anonymous sign-in
const signInAnonymously = () => firebaseSignInAnonymously(auth);

// Export a promise that resolves immediately since npm package loads synchronously
export const firebaseReady = Promise.resolve({ 
  db, 
  auth, 
  signInAnonymously,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged
});

// Named exports for direct import
export { db, auth, signInAnonymously, collection, addDoc, doc, getDoc, setDoc, onAuthStateChanged };