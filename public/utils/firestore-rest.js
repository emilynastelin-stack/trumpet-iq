// firestore-rest.js - Firestore REST API wrapper for iOS compatibility
// Uses standard fetch API for cross-platform compatibility

// Your Firebase project configuration
const FIREBASE_PROJECT_ID = 'trumpet-iq';
const FIRESTORE_API_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/**
 * Save a score document to Firestore
 * @param {Object} scoreData - The score data to save
 * @returns {Promise<Object>} The saved document
 */
export async function saveScore(scoreData) {
  try {
    console.log('📤 Saving score via REST API:', scoreData);
    
    // Convert JavaScript Date to Firestore Timestamp format
    const timestamp = scoreData.timestamp || new Date();
    const firestoreTimestamp = {
      timestampValue: timestamp.toISOString()
    };
    
    // Convert JavaScript object to Firestore document format
    const firestoreDoc = {
      fields: {
        userId: { stringValue: scoreData.userId },
        mode: { stringValue: scoreData.mode },
        level: { stringValue: scoreData.level },
        score: { integerValue: String(scoreData.score) },
        total: { integerValue: String(scoreData.total) },
        percentage: { integerValue: String(scoreData.percentage) },
        displayScore: { integerValue: String(scoreData.displayScore) },
        proficiencyScore: { integerValue: String(scoreData.proficiencyScore) },
        stars: { integerValue: String(scoreData.stars) },
        instrument: { stringValue: scoreData.instrument },
        key: { stringValue: scoreData.key },
        timestamp: firestoreTimestamp,
        completed: { booleanValue: scoreData.completed }
      }
    };
    
    // Add optional fields
    if (scoreData.livesLost !== undefined) {
      firestoreDoc.fields.livesLost = { integerValue: String(scoreData.livesLost) };
    }
    if (scoreData.endReason) {
      firestoreDoc.fields.endReason = { stringValue: scoreData.endReason };
    }
    
    const response = await fetch(`${FIRESTORE_API_BASE}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Score saved successfully via REST API');
      return data;
    } else {
      const errorText = await response.text();
      throw new Error(`Firestore API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error saving score via REST API:', error);
    throw error;
  }
}

/**
 * Query scores for a specific user
 * @param {string} userId - The user ID to query
 * @returns {Promise<Array>} Array of score documents
 */
export async function getUserScores(userId) {
  try {
    console.log('📥 Querying scores via REST API for user:', userId);
    
    // Firestore REST API query structure
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'scores' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'userId' },
            op: 'EQUAL',
            value: { stringValue: userId }
          }
        },
        orderBy: [{
          field: { fieldPath: 'timestamp' },
          direction: 'DESCENDING'
        }]
      }
    };
    
    const response = await fetch(`${FIRESTORE_API_BASE}:runQuery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query)
    });
    
    if (response.ok) {
      const results = await response.json();
      console.log('✅ Scores fetched successfully via REST API');
      
      // Parse Firestore response format
      const scores = [];
      
      if (Array.isArray(results)) {
        for (const result of results) {
          if (result.document) {
            scores.push(convertFirestoreDocument(result.document));
          }
        }
      }
      
      console.log(`📊 Found ${scores.length} scores`);
      return scores;
    } else {
      throw new Error(`Firestore API error: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error querying scores via REST API:', error);
    throw error;
  }
}

/**
 * Convert Firestore document format to JavaScript object
 * @param {Object} firestoreDoc - The Firestore document
 * @returns {Object} JavaScript object
 */
function convertFirestoreDocument(firestoreDoc) {
  const data = {};
  const fields = firestoreDoc.fields || {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      data[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      data[key] = parseInt(value.integerValue, 10);
    } else if (value.doubleValue !== undefined) {
      data[key] = parseFloat(value.doubleValue);
    } else if (value.booleanValue !== undefined) {
      data[key] = value.booleanValue;
    } else if (value.timestampValue !== undefined) {
      data[key] = new Date(value.timestampValue);
    }
  }
  
  // Add document ID
  if (firestoreDoc.name) {
    const parts = firestoreDoc.name.split('/');
    data.id = parts[parts.length - 1];
  }
  
  return data;
}
