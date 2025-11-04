// simple-auth.js - Local UUID-based authentication for iOS WebView
// Works around Firebase Auth hanging issues in Capacitor

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getOrCreateUser() {
  const STORAGE_KEY = 'trumpet-iq-user-id';
  
  try {
    // Try to get existing user ID from localStorage
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
      // Create new user ID
      userId = generateUUID();
      localStorage.setItem(STORAGE_KEY, userId);
      console.log('✅ Created new user ID:', userId);
    } else {
      console.log('✅ Found existing user ID:', userId);
    }
    
    return {
      uid: userId,
      isAnonymous: true
    };
  } catch (error) {
    console.error('❌ Error with localStorage:', error);
    // Fallback to session-only ID
    const sessionId = generateUUID();
    console.warn('⚠️ Using session-only ID:', sessionId);
    return {
      uid: sessionId,
      isAnonymous: true
    };
  }
}

export function getCurrentUser() {
  const STORAGE_KEY = 'trumpet-iq-user-id';
  const userId = localStorage.getItem(STORAGE_KEY);
  
  if (userId) {
    return {
      uid: userId,
      isAnonymous: true
    };
  }
  
  return null;
}
