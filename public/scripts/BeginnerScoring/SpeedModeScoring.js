export class BeginnerSpeedModeScoring {
  constructor(difficulty = 'basic', intervalSpeed = 2000) {
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.difficulty = difficulty;
    this.intervalSpeed = intervalSpeed; // ms per note (3000, 2000, 1000, 500)
    
    // Level difficulty weights for proficiency calculation
    this.levelWeights = {
      'basic': 1.0,
      'beginner': 1.2,
      'intermediate': 1.5,
      'advanced': 2.0
    };
    
    // Mode weight (speed mode is highest priority for proficiency)
    this.modeWeight = 1.5;
  }

  markCorrect() {
    this.correctAnswers++;
  }

  markIncorrect() {
    this.wrongAnswers++;
  }

  // Get total points (100 per correct answer)
  getTotalPoints() {
    return this.correctAnswers * 100;
  }

  // Get stars based on beginner thresholds, scaled by interval speed
  // For 1s interval: <1500pts = 1★, 1500-2500pts = 2★, 2500+pts = 3★
  getStars() {
    const points = this.getTotalPoints();
    
    // Scale thresholds based on interval speed
    // Base thresholds for 1s (1000ms) interval
    const baseThreshold1 = 1500;
    const baseThreshold2 = 2500;
    
    // Scale: 3s gets 0.33x, 2s gets 0.5x, 1s gets 1x, 0.5s gets 2x
    const scaleFactor = 1000 / this.intervalSpeed;
    
    const threshold1 = baseThreshold1 * scaleFactor;
    const threshold2 = baseThreshold2 * scaleFactor;
    
    if (points >= threshold2) return 3;
    if (points >= threshold1) return 2;
    return 1;
  }

  // Proficiency score with penalty for wrong answers
  // Deduct 50pts per wrong answer, min score is 0
  getProficiencyScore() {
    const levelWeight = this.levelWeights[this.difficulty] || 1.0;
    
    // Calculate raw proficiency points
    const correctPoints = this.correctAnswers * 100;
    const wrongPenalty = this.wrongAnswers * 50;
    const rawProficiency = Math.max(0, correctPoints - wrongPenalty);
    
    return rawProficiency * levelWeight * this.modeWeight;
  }

  getScores() {
    return {
      displayScore: this.getTotalPoints(),            // points shown to player
      proficiencyScore: this.getProficiencyScore(),   // for backend (with penalty)
      stars: this.getStars(),
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
    };
  }

  reset() {
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
  }
}
