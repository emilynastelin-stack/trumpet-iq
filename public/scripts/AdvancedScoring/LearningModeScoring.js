// AdvancedLearningModeScoring.js

export class AdvancedLearningModeScoring {
  constructor(difficulty = 'basic', totalQuestions = 20) {
    this.totalQuestions = totalQuestions;
    this.correctAnswers = 0;
    this.difficulty = difficulty;
    
    // Level difficulty weights for proficiency calculation
    this.levelWeights = {
      'basic': 1.0,
      'beginner': 1.2,
      'intermediate': 1.5,
      'advanced': 2.0
    };
    
    // Mode weight (learning is baseline)
    this.modeWeight = 1.0;
  }

  // Mark an answer correct
  markCorrect() {
    this.correctAnswers++;
  }

  // Mark an answer incorrect (no-op for learning mode since we only count correct/total)
  markIncorrect() {
    // Learning mode doesn't track wrong answers separately
    // Score is based on correct answers out of total questions
  }

  // Calculate percentage correct (0-100%)
  getAccuracyPercent() {
    if (this.totalQuestions === 0) return 0;
    return (this.correctAnswers / this.totalQuestions) * 100;
  }

  // Get stars based on advanced thresholds
  // Advanced: ≤70% = 1★, 70-90% = 2★, 90%+ = 3★
  getStars() {
    const accuracy = this.getAccuracyPercent();
    if (accuracy >= 90) return 3;
    if (accuracy > 70) return 2;
    return 1;
  }

  // Calculate weighted proficiency score for progress tracking
  getProficiencyScore() {
    const levelWeight = this.levelWeights[this.difficulty] || 1.0;
    return this.getAccuracyPercent() * levelWeight * this.modeWeight;
  }

  // Return display score, proficiency score, and stars
  getScores() {
    return {
      displayScore: Math.round(this.getAccuracyPercent()),  // what player sees (percentage)
      proficiencyScore: this.getProficiencyScore(),         // for backend logic
      stars: this.getStars(),
      correctAnswers: this.correctAnswers,
      totalQuestions: this.totalQuestions
    };
  }

  // Reset scoring (start a new round)
  reset() {
    this.correctAnswers = 0;
  }
}
