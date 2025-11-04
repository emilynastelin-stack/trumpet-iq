/**
 * Transposition Proficiency Tracker
 * 
 * Treats each instrument/key combination as a separate "language" with its own
 * proficiency progression. Implements CEFR-like level weighting where performance
 * at higher difficulty levels is worth more than at lower levels.
 * 
 * CEFR Mapping:
 * - Basic → A1 (weight: 1.0)
 * - Beginner → A2 (weight: 1.5)
 * - Intermediate → B1/B2 (weight: 2.5)
 * - Advanced → C1/C2 (weight: 4.0)
 * 
 * Example: 40% on B1 test (40 × 2.5 = 100 proficiency) equals 100% on A1 test (100 × 1.0 = 100)
 */

import { ProficiencyCalculator } from './ProficiencyCalculator.js';

export class TranspositionProficiency {
  /**
   * CEFR level weights - higher difficulty = higher weight
   */
  static LEVEL_WEIGHTS = {
    'basic': 1.0,        // A1 - Beginner
    'beginner': 1.5,     // A2 - Elementary
    'intermediate': 2.5, // B1/B2 - Intermediate
    'advanced': 4.0      // C1/C2 - Advanced
  };

  /**
   * Get storage key for instrument/key combination
   */
  static getKey(userId, instrument, key) {
    return `transposition_${userId}_${instrument}_${key}`;
  }

  /**
   * Get proficiency data for a specific instrument/key combo
   */
  static getData(userId, instrument, key) {
    const storageKey = this.getKey(userId, instrument, key);
    const data = localStorage.getItem(storageKey);
    
    if (!data) {
      return {
        instrument: instrument,
        key: key,
        proficiencyScore: 0.2, // Start at "Developing" (A1 level)
        lastPractice: new Date().toISOString(),
        sessionHistory: [],
        notesCovered: new Set(),
        createdAt: new Date().toISOString()
      };
    }
    
    const parsed = JSON.parse(data);
    parsed.notesCovered = new Set(parsed.notesCovered || []);
    return parsed;
  }

  /**
   * Save proficiency data for instrument/key combo
   */
  static saveData(userId, instrument, key, data) {
    const storageKey = this.getKey(userId, instrument, key);
    const toSave = {
      ...data,
      notesCovered: Array.from(data.notesCovered || [])
    };
    localStorage.setItem(storageKey, JSON.stringify(toSave));
  }

  /**
   * Calculate weighted proficiency based on difficulty level
   * 
   * @param {number} rawScore - Raw performance score (0-1)
   * @param {string} difficulty - Difficulty level
   * @returns {number} Weighted proficiency (0-1)
   */
  static calculateWeightedProficiency(rawScore, difficulty) {
    const weight = this.LEVEL_WEIGHTS[difficulty] || 1.0;
    
    // Scale the raw score by the difficulty weight
    // But normalize so that perfect scores at each level map to appropriate proficiency
    // A1 (100%) = 25% proficiency, A2 (100%) = 37.5%, B1/B2 (100%) = 62.5%, C1/C2 (100%) = 100%
    const maxWeight = this.LEVEL_WEIGHTS['advanced']; // 4.0
    const normalizedWeight = weight / maxWeight;
    
    return rawScore * normalizedWeight;
  }

  /**
   * Record a practice session for a specific instrument/key combo
   * 
   * @param {string} userId - User ID
   * @param {string} instrument - Instrument (e.g., 'Bb', 'C', 'D', 'Eb')
   * @param {string} key - Key (e.g., 'Bb', 'C', 'D', 'Eb')
   * @param {Object} sessionData - Session metrics
   * @returns {Object} Updated proficiency data
   */
  static recordSession(userId, instrument, key, sessionData) {
    const data = this.getData(userId, instrument, key);
    
    // Calculate days since last practice
    const lastPractice = new Date(data.lastPractice);
    const now = new Date();
    const daysSince = Math.floor((now - lastPractice) / (1000 * 60 * 60 * 24));
    
    // Calculate current session accuracy
    const accuracy = sessionData.total > 0 ? sessionData.score / sessionData.total : 0;
    
    // Update notes covered
    if (sessionData.notesPracticed && Array.isArray(sessionData.notesPracticed)) {
      sessionData.notesPracticed.forEach(note => data.notesCovered.add(note));
    }
    
    // Calculate coverage (assume 36 possible notes)
    const totalPossibleNotes = 36;
    const coverage = ProficiencyCalculator.calculateCoverage(
      data.notesCovered.size,
      totalPossibleNotes
    );
    
    // Get recent accuracies for consistency
    const recentAccuracies = data.sessionHistory
      .slice(-9)
      .map(s => s.accuracy)
      .concat([accuracy]);
    
    const consistency = ProficiencyCalculator.calculateConsistency(recentAccuracies);
    
    // Build metrics
    const metrics = {
      accuracy: accuracy,
      avgSpeed: sessionData.avgSpeed || 2.0,
      coverage: coverage,
      consistency: consistency
    };
    
    // Calculate raw performance (0-1)
    const rawPerformance = ProficiencyCalculator.calculatePerformance(metrics);
    
    // Apply CEFR difficulty weighting
    const weightedPerformance = this.calculateWeightedProficiency(
      rawPerformance,
      sessionData.difficulty
    );
    
    console.log(`📊 Transposition ${instrument}→${key} at ${sessionData.difficulty}:`, {
      rawPerformance: Math.round(rawPerformance * 100) + '%',
      difficulty: sessionData.difficulty,
      weight: this.LEVEL_WEIGHTS[sessionData.difficulty],
      weightedPerformance: Math.round(weightedPerformance * 100) + '%'
    });
    
    // Calculate new proficiency with decay and smoothing
    const newProficiency = ProficiencyCalculator.calculateNewProficiency(
      data.proficiencyScore,
      { ...metrics, accuracy: weightedPerformance }, // Use weighted accuracy
      daysSince,
      0.15
    );
    
    // Record session
    const sessionRecord = {
      timestamp: now.toISOString(),
      accuracy: accuracy,
      rawPerformance: rawPerformance,
      weightedPerformance: weightedPerformance,
      difficulty: sessionData.difficulty,
      proficiency: newProficiency,
      mode: sessionData.mode
    };
    
    data.sessionHistory.push(sessionRecord);
    if (data.sessionHistory.length > 30) {
      data.sessionHistory = data.sessionHistory.slice(-30);
    }
    
    // Update proficiency
    data.proficiencyScore = newProficiency;
    data.lastPractice = now.toISOString();
    
    // Save
    this.saveData(userId, instrument, key, data);
    
    const band = ProficiencyCalculator.getProficiencyBand(newProficiency);
    const displayScore = ProficiencyCalculator.toDisplayScore(newProficiency);
    
    console.log(`🎯 ${instrument}→${key} new proficiency:`, {
      score: displayScore,
      band: band.name
    });
    
    return {
      proficiencyScore: newProficiency,
      proficiencyDisplay: displayScore,
      band: band,
      weightedPerformance: weightedPerformance
    };
  }

  /**
   * Get current proficiency with decay for instrument/key combo
   */
  static getCurrentProficiency(userId, instrument, key) {
    const data = this.getData(userId, instrument, key);
    
    const lastPractice = new Date(data.lastPractice);
    const now = new Date();
    const daysSince = Math.floor((now - lastPractice) / (1000 * 60 * 60 * 24));
    
    const currentProficiency = ProficiencyCalculator.applyDecay(
      data.proficiencyScore,
      daysSince
    );
    
    const band = ProficiencyCalculator.getProficiencyBand(currentProficiency);
    
    return {
      proficiencyScore: currentProficiency,
      proficiencyDisplay: ProficiencyCalculator.toDisplayScore(currentProficiency),
      band: band,
      daysSinceLastPractice: daysSince,
      totalSessions: data.sessionHistory.length,
      notesCovered: data.notesCovered.size
    };
  }

  /**
   * Get all instrument/key combinations for a user
   */
  static getAllCombinations(userId) {
    const instruments = ['Bb', 'C', 'D', 'Eb'];
    const keys = ['A', 'Bb', 'H', 'C', 'D', 'Eb', 'E', 'F', 'G'];
    const results = {};
    
    instruments.forEach(instrument => {
      results[instrument] = {};
      keys.forEach(key => {
        // Skip native keys (e.g., Bb instrument in Bb key)
        if (instrument === key) {
          results[instrument][key] = null;
        } else {
          results[instrument][key] = this.getCurrentProficiency(userId, instrument, key);
        }
      });
    });
    
    return results;
  }

  /**
   * Get default/native proficiency (Bb trumpet in Bb key)
   * This is the main proficiency shown at the top of the progress page
   */
  static getDefaultProficiency(userId) {
    return this.getCurrentProficiency(userId, 'Bb', 'Bb');
  }
}

/**
 * Example usage:
 * 
 * // After a game session on C trumpet playing in Eb
 * TranspositionProficiency.recordSession(userId, 'C', 'Eb', {
 *   score: 17,
 *   total: 20,
 *   avgSpeed: 1.5,
 *   notesPracticed: ['E4', 'F4', 'G4', ...],
 *   difficulty: 'intermediate', // B1/B2 level
 *   mode: 'learning'
 * });
 * 
 * // Get proficiency for that combo
 * const proficiency = TranspositionProficiency.getCurrentProficiency(userId, 'C', 'Eb');
 * console.log(`C→Eb proficiency: ${proficiency.proficiencyDisplay}/100 (${proficiency.band.name})`);
 * 
 * // Get all combinations for progress page
 * const allCombos = TranspositionProficiency.getAllCombinations(userId);
 * console.log('Bb trumpet in D:', allCombos['Bb']['D']);
 */
