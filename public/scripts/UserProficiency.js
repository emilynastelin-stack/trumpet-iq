/**
 * User Proficiency Manager
 * 
 * Tracks and updates user proficiency over time using CEFR-inspired model.
 * Stores proficiency data in localStorage with decay and progression.
 */

import { ProficiencyCalculator } from './ProficiencyCalculator.js';

export class UserProficiency {
  /**
   * Get user's current proficiency data
   * @param {string} userId - User ID
   * @returns {Object} Proficiency data
   */
  static getUserData(userId) {
    const key = `proficiency_${userId}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      // Initialize new user
      return {
        proficiencyScore: 0.2, // Start at "Developing" level
        lastPractice: new Date().toISOString(),
        sessionHistory: [],
        notesCovered: new Set(),
        createdAt: new Date().toISOString()
      };
    }
    
    const parsed = JSON.parse(data);
    // Convert notesCovered back to Set
    parsed.notesCovered = new Set(parsed.notesCovered || []);
    return parsed;
  }

  /**
   * Save user proficiency data
   * @param {string} userId - User ID
   * @param {Object} data - Proficiency data
   */
  static saveUserData(userId, data) {
    const key = `proficiency_${userId}`;
    // Convert Set to Array for JSON storage
    const toSave = {
      ...data,
      notesCovered: Array.from(data.notesCovered || [])
    };
    localStorage.setItem(key, JSON.stringify(toSave));
  }

  /**
   * Record a practice session and update proficiency
   * 
   * @param {string} userId - User ID
   * @param {Object} sessionData - Session metrics
   * @param {number} sessionData.score - Correct answers
   * @param {number} sessionData.total - Total questions
   * @param {number} sessionData.avgSpeed - Average time per note (seconds)
   * @param {Array<string>} sessionData.notesPracticed - Notes practiced in this session
   * @param {string} sessionData.mode - Game mode
   * @param {string} sessionData.difficulty - Difficulty level
   * @param {string} sessionData.instrument - Instrument
   * @param {string} sessionData.key - Key
   * @returns {Object} Updated proficiency data
   */
  static recordSession(userId, sessionData) {
    const userData = this.getUserData(userId);
    
    // Calculate days since last practice
    const lastPractice = new Date(userData.lastPractice);
    const now = new Date();
    const daysSince = Math.floor((now - lastPractice) / (1000 * 60 * 60 * 24));
    
    // Calculate current session accuracy
    const accuracy = sessionData.total > 0 ? sessionData.score / sessionData.total : 0;
    
    // Update notes covered
    if (sessionData.notesPracticed && Array.isArray(sessionData.notesPracticed)) {
      sessionData.notesPracticed.forEach(note => userData.notesCovered.add(note));
    }
    
    // Calculate coverage (assume 36 possible notes across common ranges)
    const totalPossibleNotes = 36;
    const coverage = ProficiencyCalculator.calculateCoverage(
      userData.notesCovered.size,
      totalPossibleNotes
    );
    
    // Get recent accuracies for consistency calculation (last 10 sessions)
    const recentAccuracies = userData.sessionHistory
      .slice(-9) // Get last 9
      .map(s => s.accuracy)
      .concat([accuracy]); // Add current
    
    const consistency = ProficiencyCalculator.calculateConsistency(recentAccuracies);
    
    // Build metrics for proficiency calculation
    const metrics = {
      accuracy: accuracy,
      avgSpeed: sessionData.avgSpeed || 2.0,
      coverage: coverage,
      consistency: consistency
    };
    
    console.log('📊 Proficiency metrics:', {
      accuracy: Math.round(accuracy * 100) + '%',
      avgSpeed: metrics.avgSpeed + 's',
      coverage: Math.round(coverage * 100) + '%',
      consistency: Math.round(consistency * 100) + '%',
      daysSince: daysSince
    });
    
    // Calculate new proficiency with decay and smoothing
    const newProficiency = ProficiencyCalculator.calculateNewProficiency(
      userData.proficiencyScore,
      metrics,
      daysSince,
      0.15 // alpha - learning rate
    );
    
    // Record this session in history (keep last 30)
    const sessionRecord = {
      timestamp: now.toISOString(),
      accuracy: accuracy,
      speed: sessionData.avgSpeed,
      proficiency: newProficiency,
      mode: sessionData.mode,
      difficulty: sessionData.difficulty,
      instrument: sessionData.instrument,
      key: sessionData.key
    };
    
    userData.sessionHistory.push(sessionRecord);
    if (userData.sessionHistory.length > 30) {
      userData.sessionHistory = userData.sessionHistory.slice(-30);
    }
    
    // Update user data
    userData.proficiencyScore = newProficiency;
    userData.lastPractice = now.toISOString();
    
    // Save to localStorage
    this.saveUserData(userId, userData);
    
    const band = ProficiencyCalculator.getProficiencyBand(newProficiency);
    console.log('🎯 New proficiency:', {
      score: ProficiencyCalculator.toDisplayScore(newProficiency),
      band: band.name,
      change: Math.round((newProficiency - userData.proficiencyScore) * 100)
    });
    
    return {
      proficiencyScore: newProficiency,
      proficiencyDisplay: ProficiencyCalculator.toDisplayScore(newProficiency),
      band: band,
      metrics: metrics
    };
  }

  /**
   * Get current proficiency with decay applied (for display purposes)
   * 
   * @param {string} userId - User ID
   * @returns {Object} Current proficiency info
   */
  static getCurrentProficiency(userId) {
    const userData = this.getUserData(userId);
    
    // Calculate days since last practice
    const lastPractice = new Date(userData.lastPractice);
    const now = new Date();
    const daysSince = Math.floor((now - lastPractice) / (1000 * 60 * 60 * 24));
    
    // Apply decay
    const currentProficiency = ProficiencyCalculator.applyDecay(
      userData.proficiencyScore,
      daysSince
    );
    
    const band = ProficiencyCalculator.getProficiencyBand(currentProficiency);
    
    return {
      proficiencyScore: currentProficiency,
      proficiencyDisplay: ProficiencyCalculator.toDisplayScore(currentProficiency),
      band: band,
      daysSinceLastPractice: daysSince,
      totalSessions: userData.sessionHistory.length,
      notesCovered: userData.notesCovered.size
    };
  }

  /**
   * Get proficiency trend over time
   * 
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Array} Proficiency scores over time
   */
  static getProficiencyTrend(userId, days = 30) {
    const userData = this.getUserData(userId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return userData.sessionHistory
      .filter(s => new Date(s.timestamp) >= cutoff)
      .map(s => ({
        date: s.timestamp,
        proficiency: ProficiencyCalculator.toDisplayScore(s.proficiency),
        accuracy: Math.round(s.accuracy * 100),
        mode: s.mode
      }));
  }
}
