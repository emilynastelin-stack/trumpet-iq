// firebase.js - Dynamic import wrapper for Firebase npm package
// This file dynamically imports Firebase to work around Vite's module resolution

let firebaseInitialized = false;
let firebaseExports = null;

async function initializeFirebase() {
  if (firebaseInitialized && firebaseExports) {
    return firebaseExports;
  }

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js');
    const { getFirestore, collection, addDoc, doc, getDoc, setDoc, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js');
    const { getAuth, signInAnonymously: firebaseSignInAnonymously, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js');
    
    const firebaseConfig = {
      apiKey: "AIzaSyC8VDmCr_pfQLS6J7PCwdyf-Y6YSYXjLD8",
      authDomain: "trumpet-iq.firebaseapp.com",
      projectId: "trumpet-iq",
      storageBucket: "trumpet-iq.firebasestorage.app",
      messagingSenderId: "836505918959",
      appId: "1:836505918959:web:54e5fdadf41edd93892a1a",
      measurementId: "G-CMSETK0GLG"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    const signInAnonymously = () => firebaseSignInAnonymously(auth);

    firebaseExports = {
      db,
      auth,
      signInAnonymously,
      collection,
      addDoc,
      doc,
      getDoc,
      setDoc,
      getDocs,
      query,
      where,
      orderBy,
      onAuthStateChanged
    };
    
    firebaseInitialized = true;
    return firebaseExports;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw new Error('Firebase initialization failed. Check your internet connection.');
  }
}

// Export a promise that resolves when Firebase is ready
export const firebaseReady = initializeFirebase();

// Named exports for direct import (will be available after firebaseReady resolves)
export const db = firebaseReady.then(exports => exports.db);
export const auth = firebaseReady.then(exports => exports.auth);
export const signInAnonymously = firebaseReady.then(exports => exports.signInAnonymously);
export const collection = firebaseReady.then(exports => exports.collection);
export const addDoc = firebaseReady.then(exports => exports.addDoc);
export const doc = firebaseReady.then(exports => exports.doc);
export const getDoc = firebaseReady.then(exports => exports.getDoc);
export const setDoc = firebaseReady.then(exports => exports.setDoc);
export const getDocs = firebaseReady.then(exports => exports.getDocs);
export const query = firebaseReady.then(exports => exports.query);
export const where = firebaseReady.then(exports => exports.where);
export const orderBy = firebaseReady.then(exports => exports.orderBy);
export const onAuthStateChanged = firebaseReady.then(exports => exports.onAuthStateChanged);