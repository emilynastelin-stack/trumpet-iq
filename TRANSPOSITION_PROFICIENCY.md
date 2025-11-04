# Transposition Proficiency System - CEFR-Based Implementation

## Overview

The proficiency system now treats **each instrument/key combination as a separate "language"** with independent tracking and CEFR-weighted scoring. This means:

- **Bb trumpet in Bb key** (default/native) has its own proficiency
- **C trumpet in Eb key** has its own proficiency
- **D trumpet in F key** has its own proficiency
- ...and so on for all combinations

## CEFR Level Weighting

Performance at higher difficulty levels is weighted MORE than lower levels:

| Difficulty | CEFR Level | Weight | Example |
|------------|------------|--------|---------|
| **Basic** | A1 | 1.0× | 100% accuracy = 25 proficiency |
| **Beginner** | A2 | 1.5× | 100% accuracy = 37.5 proficiency |
| **Intermediate** | B1/B2 | 2.5× | 100% accuracy = 62.5 proficiency |
| **Advanced** | C1/C2 | 4.0× | 100% accuracy = 100 proficiency |

### Key Insight

**40% on B1/B2 (Intermediate) = 100% on A1 (Basic)**

```
Basic:        100% × 1.0 = 100 weighted points
Intermediate:  40% × 2.5 = 100 weighted points
```

This reflects that **partial competency at a higher level is worth more** than perfect competency at a lower level, just like in language learning.

## Implementation

### Core Files

**`/public/scripts/TranspositionProficiency.js`**
- Manages proficiency for each instrument/key combo separately
- Applies CEFR difficulty weights
- Stores data in localStorage with keys like `transposition_userId_Bb_D`
- Provides methods for recording sessions and retrieving proficiency

**`/public/scripts/ProficiencyCalculator.js`**
- Core calculation engine (unchanged)
- Handles EMA smoothing, decay, consistency, coverage

**`gameLogic.js`**
- Updated to use `TranspositionProficiency.recordSession(userId, instrument, key, data)`
- Tracks each combo independently

**`Progress.astro`**
- Top proficiency shows **Bb→Bb (default/native)**
- Transposition Mastery section shows all other combos
- Each instrument tab (C, Bb, D, Eb) shows that instrument's proficiency across all keys

## Data Flow

```
Game Session: C trumpet, Eb key, Intermediate difficulty
    ↓
Calculate raw performance (e.g., 85% accuracy + speed + coverage + consistency)
    ↓
Apply CEFR weighting: rawScore × 2.5 (B1/B2 weight)
    ↓
Load previous proficiency for C→Eb combo
    ↓
Apply decay if needed
    ↓
Smooth with EMA (alpha = 0.15)
    ↓
Save to localStorage: transposition_userId_C_Eb
    ↓
Display in Progress page under C trumpet / Eb key
```

## Progress Page Display

### Hero Section (Top)
- **Proficiency**: Shows **Bb→Bb** (default/native) proficiency
- This is what most users will see growing as they practice normally
- Range: 0-100 with band name (e.g., "Functional", "Mastered")

### Transposition Mastery Section
- **Tabs**: C Trumpet, Bb Trumpet, D Trumpet, Eb Trumpet
- **Keys**: A, Bb, H, C, D, Eb, E, F, G (native key disabled)
- **Display**: Each non-native key shows its own proficiency (0-100)
- **Color coding**: 
  - 0-50 = Red (low)
  - 50-75 = Orange (medium)
  - 75-100 = Green (high)

## Examples

### Scenario 1: Beginner Player
**Practice**: Bb trumpet, Bb key, Basic difficulty, 90% accuracy
```
Raw performance: 0.90
CEFR weight: 1.0 (A1)
Weighted: 0.90 × 1.0 = 0.90
Normalized: 0.90 × 0.25 = 0.225 (22.5/100)
Band: "Early Learning"
```

### Scenario 2: Intermediate Player
**Practice**: C trumpet, Eb key, Intermediate difficulty, 70% accuracy
```
Raw performance: 0.70
CEFR weight: 2.5 (B1/B2)
Weighted: 0.70 × 2.5 = 1.75
Normalized: 1.75 / 4.0 = 0.4375 (43.75/100)
Band: "Functional"
```

### Scenario 3: Advanced Player
**Practice**: D trumpet, F key, Advanced difficulty, 85% accuracy
```
Raw performance: 0.85
CEFR weight: 4.0 (C1/C2)
Weighted: 0.85 × 4.0 = 3.4
Normalized: 3.4 / 4.0 = 0.85 (85/100)
Band: "Mastered"
```

## Comparison: Before vs After

### Before
- Single "proficiency" score
- Could exceed 100 (confusing)
- All instruments/keys mixed together
- No difficulty weighting

### After
- Separate proficiency for each instrument/key combo
- Always 0-100 (clear scale)
- Each "transposition language" tracked independently
- Difficulty weighted (40% on B1 = 100% on A1)

## Benefits

### 1. **Realistic Progression**
- Matches language learning models (CEFR)
- Higher difficulty = faster proficiency growth
- Encourages advancing to harder levels

### 2. **Separate "Languages"**
- C trumpet in Eb is different from Bb trumpet in D
- Each combo has its own learning curve
- Progress in one doesn't inflate others

### 3. **Difficulty Weighting**
- Rewards practicing at higher levels
- 40% at Advanced > 100% at Basic
- Natural incentive to level up

### 4. **Clear Display**
- 0-100 scale is intuitive
- Color coding (red/orange/green)
- Progress bars show growth

### 5. **Default Proficiency**
- Top of page shows Bb→Bb (native)
- Most users see this growing naturally
- Transposition section for advanced practice

## Storage Structure

Each instrument/key combo stored separately:
```javascript
localStorage keys:
- transposition_userId_Bb_Bb  // Default (shown at top)
- transposition_userId_Bb_A
- transposition_userId_Bb_D
- transposition_userId_C_Eb
- transposition_userId_C_F
- transposition_userId_D_G
- ... (36 total combinations)
```

Each contains:
```javascript
{
  instrument: "C",
  key: "Eb",
  proficiencyScore: 0.4375,        // 0-1 internal
  lastPractice: "2025-11-03T...",
  sessionHistory: [...],            // Last 30 sessions
  notesCovered: ["E4", "F4", ...],
  createdAt: "2025-11-01T..."
}
```

## API Reference

### Record a Session
```javascript
TranspositionProficiency.recordSession(userId, instrument, key, {
  score: 17,          // correct answers
  total: 20,          // total questions
  avgSpeed: 1.5,      // seconds per note
  notesPracticed: ['E4', 'F4', ...],
  difficulty: 'intermediate',  // A1, A2, B1/B2, C1/C2
  mode: 'learning'
});
```

### Get Proficiency
```javascript
// Default (Bb→Bb)
const defaultProf = TranspositionProficiency.getDefaultProficiency(userId);
// { proficiencyDisplay: 45, band: { name: "Functional" }, ... }

// Specific combo
const cToEb = TranspositionProficiency.getCurrentProficiency(userId, 'C', 'Eb');

// All combinations
const all = TranspositionProficiency.getAllCombinations(userId);
// { Bb: { A: {...}, Bb: null, D: {...}, ... }, C: { ... }, ... }
```

## Testing

1. **Play games at different difficulties**
   - Basic → See slow growth (1.0× weight)
   - Intermediate → See moderate growth (2.5× weight)
   - Advanced → See fast growth (4.0× weight)

2. **Try different instruments/keys**
   - Each combination tracked separately
   - Check Progress page → Transposition Mastery
   - Switch tabs to see different instruments

3. **Watch top proficiency (Bb→Bb)**
   - Most visible metric
   - Grows with regular practice
   - Shows overall skill level

4. **Compare difficulties**
   - 100% at Basic = 25 proficiency
   - 40% at Intermediate = 25 proficiency
   - Validates CEFR weighting working correctly

## Future Enhancements

- Visual CEFR badges (A1, A2, B1, etc.)
- "Unlock next level" notifications when hitting thresholds
- Recommended difficulty based on proficiency
- Comparison charts across instrument/key combos
- Spaced repetition scheduling per combo
