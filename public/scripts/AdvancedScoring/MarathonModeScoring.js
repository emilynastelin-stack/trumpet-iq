// AdvancedMarathonModeScoring.js

export class AdvancedMarathonScoring {
  constructor(difficulty = 'basic') {
    this.correctAnswers = 0;
    this.totalAnswers = 0;
    this.difficulty = difficulty;
    this.maxNotesForProficiency = 30; // Cap at 30 notes for proficiency calculation
    
    // Level difficulty weights for proficiency calculation
    this.levelWeights = {
      'basic': 1.0,
      'beginner': 1.2,
      'intermediate': 1.5,
      'advanced': 2.0
    };
    
    // Mode weight (marathon has pressure)
    this.modeWeight = 1.2;
  }

  markCorrect() {
    this.correctAnswers++;
    this.totalAnswers++;
  }

  markIncorrect() {
    this.totalAnswers++;
  }

  // Get total points (100 per correct answer)
  getTotalPoints() {
    return this.correctAnswers * 100;
  }

  // Get stars based on advanced thresholds
  // Advanced: ≤1000pts = 1★, 1000-2000pts = 2★, 2000+pts = 3★
  getStars() {
    const points = this.getTotalPoints();
    if (points >= 2000) return 3;
    if (points > 1000) return 2;
    return 1;
  }

  // Proficiency score weighted by difficulty and mode
  // Capped at first 30 notes to normalize long vs short sessions
  getProficiencyScore() {
    const levelWeight = this.levelWeights[this.difficulty] || 1.0;
    const notesToConsider = Math.min(this.totalAnswers, this.maxNotesForProficiency);
    
    if (notesToConsider === 0) return 0;
    
    // Calculate accuracy for capped notes
    const cappedCorrect = Math.min(this.correctAnswers, this.maxNotesForProficiency);
    const accuracy = (cappedCorrect / notesToConsider) * 100;
    
    return accuracy * levelWeight * this.modeWeight;
  }

  getScores() {
    return {
      displayScore: this.getTotalPoints(),            // points shown to player
      proficiencyScore: this.getProficiencyScore(),   // for backend
      stars: this.getStars(),
      correctAnswers: this.correctAnswers,
      totalAnswers: this.totalAnswers,
    };
  }

  reset() {
    this.correctAnswers = 0;
    this.totalAnswers = 0;
  }
}
