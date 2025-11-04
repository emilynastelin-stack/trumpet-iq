/**
 * CEFR-inspired Proficiency Calculator
 * 
 * Measures proficiency as a composite of:
 * - Accuracy: correctness percentage
 * - Speed: reaction time / fluency
 * - Coverage: variety of notes/keys practiced
 * - Consistency: stability across sessions
 * 
 * Uses exponential moving average for smooth progression
 * and decay for retention modeling.
 */

export class ProficiencyCalculator {
  /**
   * Check if beginner mode is enabled
   */
  static isBeginnerMode() {
    return localStorage.getItem('transposition-enabled') !== 'true';
  }

  /**
   * Calculate performance score from current session metrics
   * @param {Object} metrics
   * @param {number} metrics.accuracy - 0-1, percentage correct
   * @param {number} metrics.avgSpeed - average time per note in seconds
   * @param {number} metrics.coverage - 0-1, variety of material covered
   * @param {number} metrics.consistency - 0-1, stability metric
   * @returns {number} Performance score 0-1
   */
  static calculatePerformance({ accuracy, avgSpeed, coverage = 0.5, consistency = 0.5 }) {
    const isBeginnerMode = this.isBeginnerMode();
    
    // Beginner mode: more lenient speed baseline for kids
    // Advanced mode: standard expectations
    const baselineSpeed = isBeginnerMode ? 5.0 : 3.0; // seconds per note
    const normSpeed = 1 - Math.min(avgSpeed / baselineSpeed, 1);
    
    // Beginner mode: boost accuracy weight, reduce speed pressure
    // Advanced mode: direct reflection of skill
    let performance;
    if (isBeginnerMode) {
      // Kids mode: emphasize accuracy, be lenient on speed
      performance = (
        0.70 * accuracy +      // Accuracy is most important for kids
        0.10 * normSpeed +     // Speed matters much less
        0.15 * coverage +      // Some variety
        0.05 * consistency     // Less pressure on consistency
      );
      // Apply boost to make progress feel more rewarding for kids
      performance = Math.min(performance * 1.3, 1.0);
    } else {
      // Adult/advanced mode: if you perform like a master, you get master score
      performance = (
        0.80 * accuracy +      // Accuracy is king
        0.20 * normSpeed       // Speed shows true fluency
        // Coverage removed - marathon/speed modes test true mastery
        // Consistency removed - each performance speaks for itself
      );
      // If performance is excellent (>0.85), boost it to reward mastery
      if (performance >= 0.85) {
        performance = Math.min(performance * 1.15, 1.0);
      }
    }
    
    return Math.min(Math.max(performance, 0), 1); // Clamp to 0-1
  }

  /**
   * Update proficiency score using exponential moving average
   * Smooths out spikes and dips for gradual progression
   * 
   * @param {number} prevScore - Previous proficiency score (0-1)
   * @param {number} performance - Current performance (0-1)
   * @param {number} alpha - Learning rate (0-1), default 0.15
   * @returns {number} Updated proficiency score
   */
  static updateProficiency(prevScore, performance, alpha = 0.15) {
    const isBeginnerMode = this.isBeginnerMode();
    
    // Beginner mode: moderate learning rate for kids
    // Advanced mode: very high learning rate - if you're performing at mastery level, score should reflect it
    const learningRate = isBeginnerMode ? 0.40 : 0.70;
    
    // EMA formula: new = old * (1 - alpha) + current * alpha
    return prevScore * (1 - learningRate) + performance * learningRate;
  }

  /**
   * Apply decay to proficiency based on days since last practice
   * Models memory/skill decay like language learning
   * 
   * @param {number} score - Current proficiency score (0-1)
   * @param {number} daysSincePractice - Days since last session
   * @param {number} decayRate - Daily decay rate, default 0.02 (2% per day)
   * @returns {number} Decayed proficiency score
   */
  static applyDecay(score, daysSincePractice, decayRate = 0.02) {
    if (daysSincePractice <= 0) return score;
    
    const isBeginnerMode = this.isBeginnerMode();
    
    // Beginner mode: slower decay for kids (they might practice less frequently)
    // Advanced mode: standard decay
    const actualDecayRate = isBeginnerMode ? 0.01 : decayRate; // 1% vs 2% per day
    
    // Exponential decay: score * e^(-rate * days)
    return score * Math.exp(-actualDecayRate * daysSincePractice);
  }

  /**
   * Complete proficiency update with decay and smoothing
   * 
   * @param {number} prevScore - Previous proficiency (0-1)
   * @param {Object} metrics - Current session metrics
   * @param {number} daysSincePractice - Days since last session
   * @param {number} alpha - Learning rate (0-1)
   * @returns {number} New proficiency score (0-1)
   */
  static calculateNewProficiency(prevScore, metrics, daysSincePractice = 0, alpha = 0.15) {
    // 1. Calculate current performance
    const performance = this.calculatePerformance(metrics);
    
    // 2. Apply decay first if there's been a gap
    const decayed = this.applyDecay(prevScore, daysSincePractice);
    
    // 3. Smooth with exponential moving average
    const smoothed = this.updateProficiency(decayed, performance, alpha);
    
    return Math.min(Math.max(smoothed, 0), 1); // Clamp to 0-1
  }

  /**
   * Get proficiency band (internal use, like CEFR levels)
   * 
   * @param {number} score - Proficiency score (0-1)
   * @returns {Object} Band info
   */
  static getProficiencyBand(score) {
    if (score < 0.2) {
      return { level: 1, name: 'Early Learning', description: 'Needs guided help' };
    } else if (score < 0.4) {
      return { level: 2, name: 'Developing', description: 'Getting the basics' };
    } else if (score < 0.6) {
      return { level: 3, name: 'Functional', description: 'Can play most notes' };
    } else if (score < 0.8) {
      return { level: 4, name: 'Independent', description: 'Smooth transitions' };
    } else {
      return { level: 5, name: 'Mastered', description: 'Automatic accuracy' };
    }
  }

  /**
   * Calculate consistency score from recent session history
   * Uses standard deviation of recent accuracy scores
   * 
   * @param {Array<number>} recentAccuracies - Array of recent accuracy values (0-1)
   * @returns {number} Consistency score (0-1), higher = more consistent
   */
  static calculateConsistency(recentAccuracies) {
    if (!recentAccuracies || recentAccuracies.length < 2) {
      return 0.5; // Default for new users
    }

    // Calculate mean
    const mean = recentAccuracies.reduce((sum, val) => sum + val, 0) / recentAccuracies.length;
    
    // Calculate standard deviation
    const squaredDiffs = recentAccuracies.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / recentAccuracies.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to consistency score: lower std dev = higher consistency
    // Normalize: 0.3 std dev = very inconsistent (score 0), 0 = perfect (score 1)
    const consistency = Math.max(0, 1 - (stdDev / 0.3));
    
    return consistency;
  }

  /**
   * Calculate coverage score based on variety of material practiced
   * 
   * @param {Array<string>} uniqueNotesPracticed - Unique notes played
   * @param {number} totalPossibleNotes - Total notes in level/instrument
   * @returns {number} Coverage score (0-1)
   */
  static calculateCoverage(uniqueNotesPracticed, totalPossibleNotes) {
    if (!totalPossibleNotes || totalPossibleNotes === 0) return 0.5;
    
    const coverage = uniqueNotesPracticed / totalPossibleNotes;
    return Math.min(coverage, 1);
  }

  /**
   * Convert proficiency score (0-1) to display score (0-100)
   * 
   * @param {number} proficiency - Proficiency score (0-1)
   * @returns {number} Display score (0-100)
   */
  static toDisplayScore(proficiency) {
    return Math.round(proficiency * 100);
  }

  /**
   * Convert display score (0-100) to proficiency (0-1)
   * 
   * @param {number} displayScore - Display score (0-100)
   * @returns {number} Proficiency (0-1)
   */
  static fromDisplayScore(displayScore) {
    return displayScore / 100;
  }
}

/**
 * Example usage:
 * 
 * // After a game session
 * const metrics = {
 *   accuracy: 0.85,        // 85% correct
 *   avgSpeed: 1.5,         // 1.5 seconds per note
 *   coverage: 0.6,         // Practiced 60% of available notes
 *   consistency: 0.7       // Fairly consistent
 * };
 * 
 * const prevProficiency = 0.5;  // Previous score
 * const daysSince = 1;           // Practiced yesterday
 * 
 * const newProficiency = ProficiencyCalculator.calculateNewProficiency(
 *   prevProficiency,
 *   metrics,
 *   daysSince
 * );
 * 
 * console.log('New proficiency:', ProficiencyCalculator.toDisplayScore(newProficiency));
 * console.log('Band:', ProficiencyCalculator.getProficiencyBand(newProficiency));
 */
