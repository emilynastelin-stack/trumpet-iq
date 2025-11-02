// ScoringManager.js
// Factory for creating the appropriate scoring class based on mode and player type

import { BeginnerLearningModeScoring } from './BeginnerScoring/LearningModeScoring.js';
import { BeginnerMarathonScoring } from './BeginnerScoring/MarathonModeScoring.js';
import { BeginnerSpeedModeScoring } from './BeginnerScoring/SpeedModeScoring.js';
import { AdvancedLearningModeScoring } from './AdvancedScoring/LearningModeScoring.js';
import { AdvancedMarathonScoring } from './AdvancedScoring/MarathonModeScoring.js';
import { AdvancedSpeedModeScoring } from './AdvancedScoring/SpeedModeScoring.js';

export class ScoringManager {
  /**
   * Create the appropriate scoring instance
   * @param {string} mode - 'learning', 'marathon', or 'speed'
   * @param {string} playerType - 'beginner' or 'advanced'
   * @param {Object} options - Additional options
   * @param {string} options.difficulty - 'basic', 'beginner', 'intermediate', 'advanced'
   * @param {number} options.totalQuestions - For learning mode (default 20)
   * @param {number} options.intervalSpeed - For speed mode in ms (default 2000)
   * @returns {Object} Scoring instance
   */
  static createScorer(mode, playerType, options = {}) {
    const {
      difficulty = 'basic',
      totalQuestions = 20,
      intervalSpeed = 2000
    } = options;

    const isAdvanced = playerType === 'advanced';

    switch (mode) {
      case 'learning':
        return isAdvanced
          ? new AdvancedLearningModeScoring(difficulty, totalQuestions)
          : new BeginnerLearningModeScoring(difficulty, totalQuestions);

      case 'marathon':
        return isAdvanced
          ? new AdvancedMarathonScoring(difficulty)
          : new BeginnerMarathonScoring(difficulty);

      case 'speed':
        return isAdvanced
          ? new AdvancedSpeedModeScoring(difficulty, intervalSpeed)
          : new BeginnerSpeedModeScoring(difficulty, intervalSpeed);

      default:
        throw new Error(`Unknown game mode: ${mode}`);
    }
  }

  /**
   * Get player type from localStorage
   * @returns {string} 'beginner' or 'advanced'
   */
  static getPlayerType() {
    const isTranspositionEnabled = localStorage.getItem('transposition-enabled') === 'true';
    return isTranspositionEnabled ? 'advanced' : 'beginner';
  }

  /**
   * Convenience method to create scorer based on current settings
   * @param {string} mode - 'learning', 'marathon', or 'speed'
   * @param {Object} options - Additional options
   * @returns {Object} Scoring instance
   */
  static create(mode, options = {}) {
    const playerType = this.getPlayerType();
    return this.createScorer(mode, playerType, options);
  }
}

// Example usage:
// const scorer = ScoringManager.create('speed', { difficulty: 'intermediate', intervalSpeed: 1000 });
// scorer.markCorrect();
// scorer.markIncorrect();
// const results = scorer.getScores();
// console.log(results); // { displayScore, proficiencyScore, stars, correctAnswers, wrongAnswers }
