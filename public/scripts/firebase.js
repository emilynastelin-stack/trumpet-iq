// public/scripts/firebase.js
// Ensures Firebase is loaded and ready for use in browser scripts

// Wait for the global firebase object to be available
function waitForFirebase() {
  return new Promise((resolve, reject) => {
    if (window.firebase && window.firebase.auth && window.firebase.firestore) {
      resolve({
        db: window.firebase.firestore(),
        auth: window.firebase.auth(),
        signInAnonymously: (...args) => window.firebase.auth().signInAnonymously(...args)
      });
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        if (window.firebase && window.firebase.auth && window.firebase.firestore) {
          clearInterval(interval);
          resolve({
            db: window.firebase.firestore(),
            auth: window.firebase.auth(),
            signInAnonymously: (...args) => window.firebase.auth().signInAnonymously(...args)
          });
        } else if (++attempts > 50) {
          clearInterval(interval);
          reject(new Error('Firebase SDK not loaded'));
        }
      }, 100);
    }
  });
}

export const firebaseReady = waitForFirebase();
