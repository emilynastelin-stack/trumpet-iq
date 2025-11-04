# CEFR-Inspired Proficiency System

## Overview

The new proficiency scoring system is modeled after the **Common European Framework of Reference for Languages (CEFR)**, which measures stable competency rather than just raw correctness. This creates a more realistic and motivating progression curve.

## Core Principles

### 1. **Composite Scoring**
Proficiency is measured across 4 dimensions:

- **Accuracy (50%)**: How correct are you?
  - Percentage of notes/fingerings played correctly
  
- **Speed/Fluency (20%)**: How automatic is your response?
  - Average time per note (faster = more fluent)
  - Baseline: 3 seconds (slow), Target: <1 second (fluent)
  
- **Coverage (20%)**: How much variety have you practiced?
  - Unique notes/keys practiced vs total available
  - Tracks breadth of knowledge
  
- **Consistency (10%)**: How reliable are you over time?
  - Stability across recent sessions
  - Lower standard deviation = higher consistency

### 2. **Smooth Progression (EMA)**
Uses **Exponential Moving Average** with alpha = 0.15:
- Prevents sharp jumps from one good/bad session
- Gradual, stable growth curve
- Formula: `new = old × 0.85 + current × 0.15`

### 3. **Skill Decay**
Models realistic memory curves:
- Proficiency decays at 2% per day without practice
- Motivates regular practice
- Formula: `score × e^(-0.02 × days)`

### 4. **Proficiency Bands**
Internal competency levels (0-100 scale):

| Score | Band | Description |
|-------|------|-------------|
| 0-20 | Early Learning | Needs guided help |
| 20-40 | Developing | Getting the basics |
| 40-60 | Functional | Can play most notes |
| 60-80 | Independent | Smooth transitions |
| 80-100 | Mastered | Automatic accuracy |

## Implementation

### Files Created

1. **`/public/scripts/ProficiencyCalculator.js`**
   - Core calculation engine
   - All proficiency math functions
   - Band determination logic

2. **`/public/scripts/UserProficiency.js`**
   - User data management
   - Session recording
   - localStorage persistence
   - Proficiency tracking over time

### Integration Points

**`gameLogic.js`** - Updated to:
- Track timing per note
- Track unique notes practiced
- Calculate average speed
- Call `UserProficiency.recordSession()` on game end
- Save proficiency scores to Firestore

**`Progress.astro`** - Updated to:
- Display overall proficiency score (0-100)
- Show proficiency band name
- Use proficiency for activity chart
- Load proficiency from localStorage

## Data Flow

```
Game Session
    ↓
Track: accuracy, speed, notes covered
    ↓
Calculate metrics (accuracy, speed, coverage, consistency)
    ↓
Load previous proficiency from localStorage
    ↓
Apply decay based on days since last practice
    ↓
Calculate performance score (0-1) from metrics
    ↓
Smooth with EMA (alpha = 0.15)
    ↓
Save new proficiency to localStorage
    ↓
Save to Firestore for cross-device sync
    ↓
Display in Progress page
```

## Benefits

### 1. **Realistic Progression**
- No artificial caps or multipliers
- Natural learning curve
- Reflects actual skill development

### 2. **Smooth Growth**
- Gradual improvement feels earned
- One bad session won't destroy progress
- Consistent practice rewarded

### 3. **Multi-Dimensional**
- Accuracy alone isn't enough
- Speed/fluency matters
- Variety of practice matters
- Consistency matters

### 4. **Retention Modeling**
- Decay encourages regular practice
- Realistic skill fade without practice
- Comeback progress feels natural

### 5. **Motivation**
- Clear progression bands
- Visible improvement over time
- Multiple ways to improve (speed, variety, consistency)

## Example Calculation

**Session Data:**
- 85% accuracy (17/20 correct)
- 1.5 seconds average per note
- Practiced 12 unique notes (out of 36 total)
- Recent accuracies: [0.80, 0.85, 0.82, 0.88, 0.85] (consistent)
- Last practice: 1 day ago
- Previous proficiency: 50

**Calculation:**
```javascript
// Normalize speed: 1 - (1.5 / 3.0) = 0.5
// Coverage: 12 / 36 = 0.33
// Consistency: stdDev = 0.03 → 1 - (0.03/0.3) = 0.9

performance = (
  0.50 × 0.85 +  // accuracy
  0.20 × 0.50 +  // speed
  0.20 × 0.33 +  // coverage
  0.10 × 0.90    // consistency
) = 0.631

// Smooth with EMA
smoothed = 0.50 × 0.85 + 0.631 × 0.15 = 0.520

// Apply 1-day decay
decayed = 0.520 × e^(-0.02 × 1) = 0.510

// Display: 51/100 → "Functional" band
```

## Usage Tips

### For Players:
- **Improve Speed**: Practice reaction time, build muscle memory
- **Improve Coverage**: Try different notes, explore full range
- **Improve Consistency**: Regular practice, avoid long gaps
- **Improve Accuracy**: Focus on correctness before speed

### For Developers:
- Weights can be adjusted per mode (e.g., Speed mode weights fluency more)
- Decay rate can be tuned (currently 2% per day)
- Alpha (learning rate) can be adjusted for faster/slower progression
- Bands can be customized for UI display

## Comparison to Old System

| Old System | New System |
|------------|------------|
| Raw score × difficulty multiplier | Composite of 4 metrics |
| Could exceed 100 | Capped at 0-100 |
| Instant jumps | Smooth EMA progression |
| No decay | 2% daily decay |
| Only accuracy matters | Accuracy, speed, variety, consistency |
| Confusing high scores | Clear 0-100 scale |

## Future Enhancements

Potential additions:
- Per-instrument proficiency tracking
- Per-key proficiency tracking
- Adaptive difficulty based on proficiency
- Spaced repetition scheduling
- Proficiency trends/charts
- Compare proficiency across modes
- Proficiency-based achievements/unlocks
