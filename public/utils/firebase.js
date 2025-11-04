// firebase.js - Dynamic import wrapper for Firebase npm package
// This file dynamically imports Firebase to work around Vite's module resolution

let firebaseInitialized = false;
let firebaseExports = null;

async function initializeFirebase() {
  if (firebaseInitialized && firebaseExports) {
    return firebaseExports;
  }

  try {
    console.log('🔥 Step 1: Importing Firebase App...');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js');
    console.log('✅ Firebase App imported');
    
    console.log('🔥 Step 2: Importing Firestore...');
    const { getFirestore, collection, addDoc, doc, getDoc, setDoc, getDocs, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js');
    console.log('✅ Firestore imported');
    
    console.log('🔥 Step 3: Importing Firebase Auth...');
    const { getAuth, signInAnonymously: firebaseSignInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js');
    console.log('✅ Firebase Auth imported');
    
    const firebaseConfig = {
      apiKey: "AIzaSyC8VDmCr_pfQLS6J7PCwdyf-Y6YSYXjLD8",
      authDomain: "trumpet-iq.firebaseapp.com",
      projectId: "trumpet-iq",
      storageBucket: "trumpet-iq.firebasestorage.app",
      messagingSenderId: "836505918959",
      appId: "1:836505918959:web:54e5fdadf41edd93892a1a",
      measurementId: "G-CMSETK0GLG"
    };

    console.log('🔥 Step 4: Initializing Firebase app with config...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
    
    console.log('🔥 Step 5: Getting Firestore instance...');
    const db = getFirestore(app);
    console.log('✅ Firestore instance created');
    
    console.log('🔥 Step 6: Getting Auth instance...');
    const auth = getAuth(app);
    console.log('✅ Auth instance created');
    
    // Set persistence to LOCAL to ensure auth state persists in iOS WebView
    console.log('🔐 Step 7: Setting Firebase Auth persistence to LOCAL...');
    console.log('⚠️ Note: Skipping setPersistence in WebView due to known hanging issue');
    console.log('⚠️ Auth state will use default persistence (should still work)');
    
    // SKIPPING: setPersistence hangs indefinitely in iOS WebView
    // The default persistence behavior should still work for our use case
    // try {
    //   await setPersistence(auth, browserLocalPersistence);
    //   console.log('✅ Persistence set to LOCAL successfully');
    // } catch (error) {
    //   console.error('❌ FAILED to set persistence:', error);
    // }
    
    console.log('✅ Persistence step skipped (using default)');
    
    console.log('🔥 Step 8: Creating signInAnonymously wrapper...');
    const signInAnonymously = () => {
      console.log('🔑 signInAnonymously() called, executing...');
      console.log('🔑 Calling firebaseSignInAnonymously with auth:', auth);
      
      const authPromise = firebaseSignInAnonymously(auth);
      console.log('🔑 Auth promise created:', authPromise);
      
      // Create a timeout promise to detect if auth hangs
      const timeout = new Promise((resolve, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('⏰ Firebase anonymous sign-in timed out after 15 seconds.'));
        }, 15000); // 15 seconds timeout
      });
      
      console.log('🔑 Racing auth promise against 15-second timeout...');
      
      // Race the auth promise against the timeout
      return Promise.race([authPromise, timeout])
        .then((result) => {
          console.log('✅ firebaseSignInAnonymously SUCCESS:', result);
          console.log('✅ User UID:', result.user.uid);
          console.log('✅ User isAnonymous:', result.user.isAnonymous);
          return result;
        })
        .catch((error) => {
          console.error('❌ firebaseSignInAnonymously FAILED:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error name:', error.name);
          console.error('❌ Full error object:', error);
          throw error;
        });
    };
    console.log('✅ signInAnonymously wrapper created');

    firebaseExports = {
      db,
      auth,
      signInAnonymously,
      setPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
      inMemoryPersistence,
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
    console.log('✅ Firebase initialization COMPLETE');
    console.log('📦 Returning exports:', Object.keys(firebaseExports));
    return firebaseExports;
  } catch (error) {
    console.error('❌ FATAL: Failed to initialize Firebase:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw new Error('Firebase initialization failed. Check your internet connection.');
  }
}

// Export a promise that resolves when Firebase is ready
export const firebaseReady = initializeFirebase();

// Named exports for direct import (will be available after firebaseReady resolves)
export const db = firebaseReady.then(exports => exports.db);
export const auth = firebaseReady.then(exports => exports.auth);
export const signInAnonymously = firebaseReady.then(exports => exports.signInAnonymously);
export const setPersistence = firebaseReady.then(exports => exports.setPersistence);
export const browserLocalPersistence = firebaseReady.then(exports => exports.browserLocalPersistence);
export const browserSessionPersistence = firebaseReady.then(exports => exports.browserSessionPersistence);
export const inMemoryPersistence = firebaseReady.then(exports => exports.inMemoryPersistence);
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