// gameLogic.js
import { levels } from '/data/levels.js';
import { getFingering } from '/utils/getFingerings.js';
import { getCurrentUser } from '/utils/simple-auth.js';
import { saveScore } from '/utils/firestore-rest.js';
import { ScoringManager } from './ScoringManager.js';
import { TranspositionProficiency } from './TranspositionProficiency.js';

/**
 * Initialize the game with dynamic fingerings.
 * @param {{
 *   instrument: stri              const scoreData = {
                userId: userId,
                mode: mode,
                level: difficulty,
                score: correctCount,
                total: noteCount,
                percentage: Math.round((correctCount / noteCount) * 100),
                displayScore: scores.displayScore,
                proficiencyScore: scores.proficiencyScore,
                stars: scores.stars,
                instrument: instrument,
                key: key,
                timestamp: new Date(),
                completed: true
              };
              console.log('💾 Saving score to Firebase (Learning late-press):', scoreData);
              console.log('🔑 User ID:', userId);
              addDoc(collection(db, 'scores'), scoreData).then((docRef) => {
                console.log('✅ Score saved successfully with ID:', docRef.id);
              }).catch((error) => {
                console.error('❌ Error saving score:', error);
              });
            }).catch((error) => {
              console.error('❌ Firebase not ready:', error);
            });g,
 *   difficulty: 'basic'|'beginner'|'intermediate'|'advanced',
 *   container?: HTMLElement,
 *   mode?: string,
 *   speedTimeout?: number
 * }} opts
 */
export function initGame({ instrument = 'Bb', key = 'Bb', difficulty = 'basic', container = document.body, mode = 'learning', speedTimeout = 2000 }) {
  let paused = false;
  // Marathon mode: track lives
  let lives = mode === 'marathon' ? 3 : Infinity;
  
  // Initialize scoring system
  const scorer = ScoringManager.create(mode, {
    difficulty: difficulty,
    totalQuestions: 20,
    intervalSpeed: speedTimeout
  });
  
  // Track timing for proficiency calculation
  let noteTimes = []; // Array of times taken per note (in seconds)
  let noteStartTime = null; // Timestamp when current note was shown
  const notesPracticed = new Set(); // Track unique notes for coverage
  
  // Pause/resume event listeners
  window.addEventListener('game:pause', () => {
    paused = true;
    if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
    if (pendingWrongTimer) { clearTimeout(pendingWrongTimer); pendingWrongTimer = null; }
  });
  window.addEventListener('game:resume', () => {
    paused = false;
    // Resume current note's timer if in speed mode
    if (mode === 'speed') {
      // Only resume if game not ended and not already answered
      if (!ended && !noteWasMarkedWrong) {
        if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
        speedTimer = setTimeout(() => {
          speedTimer = null;
          showFeedback(false);
          noteWasMarkedWrong = true;
          wrongStreak++;
          clearActiveButtons();
          currentIndex = pickRandomIndex();
          setTimeout(renderCurrent, 400);
        }, SPEED_TIMEOUT_MS);
      }
    }
  });
  // notesData is dynamic: filter the master level list by current instrument/key
  function availableNotes() {
    const all = levels[difficulty] || [];
    // keep only notes that have a valid fingering for the current instrument/key
    return all.filter(n => {
      const f = getFingering(instrument, n.note, key);
      return f !== null && typeof f !== 'undefined';
    });
  }

  let currentIndex = 0;
  const list = availableNotes();
  if (list.length > 0) currentIndex = Math.floor(Math.random() * list.length);
  let wrongStreak = 0;
  let noteCount = 0; // number of notes presented
  let correctCount = 0; // number of correct answers
  let ended = false;
  // short tolerance window so slightly staggered multi-touch presses still count
  let pendingWrongTimer = null;
  // ms to wait before deciding an attempt is wrong — small tolerance helps
  // users who press slightly staggered multi-touch combos. Increased to
  // 200ms for better real-world responsiveness on touch devices and multi-key combos.
  const WRONG_TOLERANCE_MS = 200; // ms
  // Speed mode timeout: how long the player has to submit the correct combo
  let speedTimer = null;
  const SPEED_TIMEOUT_MS = speedTimeout; // Use the provided speedTimeout
  // If the player makes a wrong attempt for the current note, mark it so
  // later correct presses for the same note don't increment score.
  let noteWasMarkedWrong = false;
  const initialInstrument = instrument;
  const initialKey = key;

  function pickRandomIndex() {
    const list = availableNotes();
    if (list.length <= 1) return 0;
    let idx = Math.floor(Math.random() * list.length);
    let attempts = 5;
    while (idx === currentIndex && attempts-- > 0) {
      idx = Math.floor(Math.random() * list.length);
    }
    return idx;
  }

  function getCurrentNoteData() {
    const list = availableNotes();
    const note = list[currentIndex];
    if (!note) return null;
    const fingering = getFingering(instrument, note.note, key);
    return { ...note, fingering };
  }

  function renderCurrent() {
    const noteData = getCurrentNoteData();
    if (!noteData) return;
    // increment number of notes presented; if in learning mode, end after 20
    noteCount++;
    // Reset per-note wrong marker when we move to the next note
    noteWasMarkedWrong = false;
    // Start timing for this note
    noteStartTime = Date.now();
    // Track which note is being practiced
    if (noteData.note) {
      notesPracticed.add(noteData.note);
    }
    // Dispatch a progress event for debugging: how many notes have been shown.
    // For UI/display purposes we report a zero-based index so the first note
    // appears as "0" rather than "1". Keep internal `noteCount` (used for
    // end-of-game totals) unchanged.
    const displayNoteCount = Math.max(0, noteCount - 1);
    const progressEv = new CustomEvent('game:progress', { 
      detail: { 
        noteCount: displayNoteCount, 
        correctCount,
        lives: mode === 'marathon' ? lives : undefined,
        mode: mode
      }, 
      bubbles: true, 
      composed: true 
    });
    try { container.dispatchEvent(progressEv); } catch (err) {}
    try { window.dispatchEvent(progressEv); } catch (err) {}
    // Clear any pressed/toggled gamepad buttons when a new card is rendered
    clearActiveButtons();
    const ev = new CustomEvent('game:setNote', {
      detail: { 
        note: noteData.note, 
        keys: Array.isArray(noteData.fingering) ? noteData.fingering : [], 
        mode,
        speedTimeout: SPEED_TIMEOUT_MS // Pass the speed timeout to the UI
      },
      bubbles: true,
      composed: true
    });
    // dispatch on both the container and the global window so listeners
    // attached to either receive the event (GameCard listens on window).
    try { container.dispatchEvent(ev); } catch (err) {}
    try { window.dispatchEvent(ev); } catch (err) {}

    // If we're in speed mode, start the per-note timeout. If the player
    // doesn't submit the correct combo within SPEED_TIMEOUT_MS, mark the
    // attempt wrong and move to the next note. Clear any previous timer first.
    if (mode === 'speed') {
      if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
      speedTimer = setTimeout(() => {
        speedTimer = null;
        // Treat as wrong and advance
        showFeedback(false);
        noteWasMarkedWrong = true;
        wrongStreak++;
        clearActiveButtons();
        currentIndex = pickRandomIndex();
        // Wait for shake animation to complete before showing next card
        setTimeout(renderCurrent, 400);
      }, SPEED_TIMEOUT_MS);
    }
  }

  function clearActiveButtons() {
    const activeEls = Array.from(document.querySelectorAll('.gp-btn.active'));
    activeEls.forEach(el => {
      el.classList.remove('active');
      // add a cleared state so we can animate the undepress for touch
      el.classList.add('cleared');
      el.setAttribute('aria-pressed', 'false');
      // Force reflow to ensure animation plays
      void el.offsetWidth;
      // remove the cleared marker after the animation (faster for touch)
      window.setTimeout(() => el.classList.remove('cleared'), 180);
    });
  }

  function showFeedback(ok) {
    const ev = new CustomEvent('game:feedback', { detail: { ok }, bubbles: true, composed: true });
    try { container.dispatchEvent(ev); } catch (err) {}
    try { window.dispatchEvent(ev); } catch (err) {}
  }

  function handleInput(activeBtns) {
    if (ended || paused) return;
    const noteData = getCurrentNoteData();
    if (!noteData || !Array.isArray(noteData.fingering)) return;
    // clear any previously scheduled wrong-evaluation for this attempt
    if (pendingWrongTimer) {
      clearTimeout(pendingWrongTimer);
      pendingWrongTimer = null;
    }
    const required = Array.from(noteData.fingering).sort((a, b) => a - b);
    const provided = Array.from(new Set(activeBtns)).sort((a, b) => a - b);

    const matches =
      required.length === provided.length &&
      required.every((v, i) => v === provided[i]);

    if (matches) {
      // If a speedTimer was running for this note, clear it — we've answered.
      if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
      // immediate accept when it matches exactly
      if (pendingWrongTimer) { clearTimeout(pendingWrongTimer); pendingWrongTimer = null; }
      showFeedback(true);
      wrongStreak = 0;
      // Only award a point if the current note hasn't already been marked wrong
      if (!noteWasMarkedWrong) {
        correctCount++;
        scorer.markCorrect();
        // Record time taken for this note (for proficiency calculation)
        if (noteStartTime) {
          const timeElapsed = (Date.now() - noteStartTime) / 1000; // Convert to seconds
          noteTimes.push(timeElapsed);
        }
      }
      // If this was the final learning note, end the game now so the
      // player's point for this note is included in the final score.
      if (mode === 'learning' && !ended && noteCount >= 20) {
        ended = true;
        // Get scores from scorer
        const scores = scorer.getScores();
        // Save via REST API (works in iOS WebView)
        const user = getCurrentUser();
        if (!user) {
          console.error('❌ No authenticated user when trying to save score');
        } else {
          // Calculate average speed for proficiency
          const avgSpeed = noteTimes.length > 0 
            ? noteTimes.reduce((sum, t) => sum + t, 0) / noteTimes.length 
            : 2.0;
          
          // Update transposition proficiency (each instrument/key combo tracked separately)
          const proficiencyUpdate = TranspositionProficiency.recordSession(
            user.uid,
            instrument,
            key,
            {
              score: correctCount,
              total: noteCount,
              avgSpeed: avgSpeed,
              notesPracticed: Array.from(notesPracticed),
              mode: mode,
              difficulty: difficulty
            }
          );
          
          const scoreData = {
            userId: user.uid,
            mode: mode,
            level: difficulty,
            score: correctCount,
            total: noteCount,
            percentage: Math.round((correctCount / noteCount) * 100),
            displayScore: scores.displayScore,
            proficiencyScore: proficiencyUpdate.proficiencyDisplay, // Use CEFR-based proficiency (0-100)
            stars: scores.stars,
            instrument: instrument,
            key: key,
            timestamp: new Date(),
            completed: true,
            avgSpeed: avgSpeed, // Store for analysis
            notesCovered: notesPracticed.size
          };
          console.log('💾 Saving score (Learning mode):', scoreData);
          console.log('🔑 User ID:', scoreData.userId);
          console.log('🎯 Proficiency:', proficiencyUpdate);
          
          saveScore(scoreData).then((result) => {
            console.log('✅ Score saved successfully!', result);
          }).catch((error) => {
            console.error('❌ Error saving score:', error);
          });
        }
        const endEv = new CustomEvent('game:end', { detail: { score: correctCount, total: noteCount, accuracy: scores.displayScore, stars: scores.stars, mode }, bubbles: true, composed: true });
        try { container.dispatchEvent(endEv); } catch (err) {}
        try { window.dispatchEvent(endEv); } catch (err) {}
      } else {
        currentIndex = pickRandomIndex();
        // In speed mode, wait for success animation (520ms). In other modes use shorter delay.
        const delay = mode === 'speed' ? 550 : 300;
        setTimeout(renderCurrent, delay);
      }
    } else {
      // Previously, speed mode treated wrong submissions as immediate wrongs
      // with no tolerance window. That prevented slightly-staggered
      // multi-touch chords from registering. Instead, allow the same small
      // tolerance window in speed mode (WRONG_TOLERANCE_MS) so late presses
      // within that window can complete the combo. The overall speedTimer
      // still enforces the total allowed time for the note.
      // Wait a short tolerance window before deciding it's wrong. This allows
      // slightly staggered multi-touch presses to all register.
      pendingWrongTimer = setTimeout(() => {
        pendingWrongTimer = null;
        // If a speedTimer is running for this note, clear it now since
        // we're about to evaluate/mark the attempt as accepted or wrong.
        if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
        // re-read active buttons from the DOM (user may have pressed another)
        const reProvided = Array.from(document.querySelectorAll('.gp-btn.active'))
          .map(el => Number(el.dataset.button))
          .filter(n => !Number.isNaN(n))
          .sort((a,b)=>a-b);
        const reMatches =
          required.length === reProvided.length &&
          required.every((v, i) => v === reProvided[i]);

        if (reMatches) {
          // the late press completed the combo — accept it
          showFeedback(true);
          wrongStreak = 0;
          // Only award a point if the current note hasn't already been marked wrong
          if (!noteWasMarkedWrong) {
            correctCount++;
            scorer.markCorrect();
          }
          if (mode === 'learning' && !ended && noteCount >= 20) {
            ended = true;
            // Get scores from scorer
            const scores = scorer.getScores();
            // Save via REST API
            const user = getCurrentUser();
            if (!user) {
              console.error('❌ No authenticated user when trying to save score (Learning final)');
            } else {
              // Calculate average speed for proficiency
              const avgSpeed = noteTimes.length > 0 
                ? noteTimes.reduce((sum, t) => sum + t, 0) / noteTimes.length 
                : 2.0;
              
              // Update transposition proficiency (each instrument/key combo tracked separately)
              const proficiencyUpdate = TranspositionProficiency.recordSession(
                user.uid,
                instrument,
                key,
                {
                  score: correctCount,
                  total: noteCount,
                  avgSpeed: avgSpeed,
                  notesPracticed: Array.from(notesPracticed),
                  mode: mode,
                  difficulty: difficulty
                }
              );
              
              const scoreData = {
                userId: user.uid,
                mode: mode,
                level: difficulty,
                score: correctCount,
                total: noteCount,
                percentage: Math.round((correctCount / noteCount) * 100),
                displayScore: scores.displayScore,
                proficiencyScore: proficiencyUpdate.proficiencyDisplay,
                stars: scores.stars,
                instrument: instrument,
                key: key,
                timestamp: new Date(),
                completed: true,
                avgSpeed: avgSpeed,
                notesCovered: notesPracticed.size
              };
              console.log('💾 Saving score (Learning final):', scoreData);
              console.log('🎯 Proficiency:', proficiencyUpdate);
              
              saveScore(scoreData).then((result) => {
                console.log('✅ Score saved successfully!', result);
              }).catch((error) => {
                console.error('❌ Error saving score:', error);
              });
            }
            const endEv = new CustomEvent('game:end', { detail: { score: correctCount, total: noteCount, accuracy: scores.displayScore, stars: scores.stars, mode }, bubbles: true, composed: true });
            try { container.dispatchEvent(endEv); } catch (err) {}
            try { window.dispatchEvent(endEv); } catch (err) {}
          } else {
            currentIndex = pickRandomIndex();
            // In speed mode, wait for success animation (520ms). In other modes use shorter delay.
            const delay = mode === 'speed' ? 550 : 300;
            setTimeout(renderCurrent, delay);
          }
        } else {
          // still wrong after tolerance window
          showFeedback(false);
          // mark this note as having had a wrong attempt so subsequent
          // correct presses won't award a point for it
          noteWasMarkedWrong = true;
          wrongStreak++;
          scorer.markIncorrect();
          
          // Marathon mode: lose a life on wrong answer
          if (mode === 'marathon') {
            lives--;
            // Dispatch lives update event with animation trigger
            const livesEv = new CustomEvent('game:lives', { 
              detail: { lives, animate: true }, 
              bubbles: true, 
              composed: true 
            });
            try { container.dispatchEvent(livesEv); } catch (err) {}
            try { window.dispatchEvent(livesEv); } catch (err) {}
            
            // Check if game over
            if (lives <= 0) {
              ended = true;
              // Get scores from scorer
              const scores = scorer.getScores();
              // Save via REST API
              const user = getCurrentUser();
              if (!user) {
                console.error('❌ No authenticated user when trying to save score (Marathon game over)');
              } else {
                // Calculate average speed for proficiency
                const avgSpeed = noteTimes.length > 0 
                  ? noteTimes.reduce((sum, t) => sum + t, 0) / noteTimes.length 
                  : 2.0;
                
                // Update transposition proficiency (each instrument/key combo tracked separately)
                const proficiencyUpdate = TranspositionProficiency.recordSession(
                  user.uid,
                  instrument,
                  key,
                  {
                    score: correctCount,
                    total: noteCount,
                    avgSpeed: avgSpeed,
                    notesPracticed: Array.from(notesPracticed),
                    mode: 'marathon',
                    difficulty: difficulty
                  }
                );
                
                const scoreData = {
                  userId: user.uid,
                  mode: 'marathon',
                  level: difficulty,
                  score: correctCount,
                  total: noteCount,
                  percentage: Math.round((correctCount / noteCount) * 100),
                  displayScore: scores.displayScore,
                  proficiencyScore: proficiencyUpdate.proficiencyDisplay,
                  stars: scores.stars,
                  instrument: instrument,
                  key: key,
                  livesLost: 3 - lives,
                  timestamp: new Date(),
                  completed: false,
                  endReason: 'lives',
                  avgSpeed: avgSpeed,
                  notesCovered: notesPracticed.size
                };
                console.log('💾 Saving score (Marathon game over):', scoreData);
                console.log('🎯 Proficiency:', proficiencyUpdate);
                
                saveScore(scoreData).then((result) => {
                  console.log('✅ Score saved successfully!', result);
                }).catch((error) => {
                  console.error('❌ Error saving score:', error);
                });
              }
              const endEv = new CustomEvent('game:end', { 
                detail: { score: correctCount, total: noteCount, reason: 'lives', accuracy: scores.displayScore, stars: scores.stars, mode }, 
                bubbles: true, 
                composed: true 
              });
              try { container.dispatchEvent(endEv); } catch (err) {}
              try { window.dispatchEvent(endEv); } catch (err) {}
              return;
            }
            
            // Continue to next note (no hint in marathon mode)
            clearActiveButtons();
            currentIndex = pickRandomIndex();
            setTimeout(renderCurrent, 400);
            return;
          }

          console.debug(`Wrong streak: ${wrongStreak}`);

          // If this was the final learning note, end the game now so the
          // final wrong attempt is included in the totals.
          if (mode === 'learning' && !ended && noteCount >= 20) {
            ended = true;
            const scores = scorer.getScores();
            const endEv = new CustomEvent('game:end', { detail: { score: correctCount, total: noteCount, accuracy: scores.displayScore, stars: scores.stars, mode }, bubbles: true, composed: true });
            try { container.dispatchEvent(endEv); } catch (err) {}
            try { window.dispatchEvent(endEv); } catch (err) {}
            return; // stop further processing for this timer
          }

          // In speed mode, wrong answers advance to the next card immediately
          if (mode === 'speed') {
            clearActiveButtons();
            currentIndex = pickRandomIndex();
            // Wait for shake animation to complete (360ms) before showing next card
            setTimeout(renderCurrent, 400);
            return;
          }

          // In learning mode only, offer a hint after a few wrong attempts.
          if (mode === 'learning' && wrongStreak >= 3) {
            const ev = new CustomEvent('game:hint', {
              detail: { keys: required },
              bubbles: true,
              composed: true,
            });
            try { container.dispatchEvent(ev); } catch (err) {}
            try { window.dispatchEvent(ev); } catch (err) {}
            wrongStreak = 0;
          }

          // Undepress buttons visually so player gets feedback
          clearActiveButtons();
        }
      }, WRONG_TOLERANCE_MS);
    }
  }

  // wire gamepad buttons (select from the whole document so GamePad can be outside the container)
  const gpButtons = Array.from(document.querySelectorAll('.gp-btn'));
  // touchMap stores touchId -> buttonElement so we can support simultaneous touches
  const touchMap = new Map();
  const onClick = (e) => {
    e.preventDefault();
    const el = e.currentTarget;
    const btn = Number(el.dataset.button);
    if (Number.isNaN(btn)) return;
    // For touch: press this button, submit the attempt immediately, then
    // clear all active buttons so the buttons undepress after each attempt.
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');

    const activeBtns = Array.from(document.querySelectorAll('.gp-btn.active'))
      .map(el => Number(el.dataset.button))
      .filter(n => !Number.isNaN(n));

    handleInput(activeBtns);
  };

  gpButtons.forEach(b => b.addEventListener('click', onClick));

  // Touch handling for multi-touch chord support on touchscreens
  let touchActivationTimeout = null;
  
  function onTouchStart(e) {
    // prevent mouse-emulation click events
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    
    // Map all touches to this button
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchMap.set(t.identifier, el);
    }
    
    // Clear any pending activation
    if (touchActivationTimeout) {
      clearTimeout(touchActivationTimeout);
    }
    
    // Batch activate all touched buttons together after a tiny delay
    // This ensures multi-touch combos activate simultaneously
    touchActivationTimeout = setTimeout(() => {
      const allTouchedButtons = new Set(touchMap.values());
      allTouchedButtons.forEach(btn => {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        // Force style recalculation for immediate visual update
        void btn.offsetWidth;
      });
      touchActivationTimeout = null;
    }, 10); // 10ms batch window for multi-touch
  }

  // When touches end, if there are no remaining touches, submit the current chord
  let touchReleaseTimeout = null;
  
  function onTouchEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Track which buttons are being released
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchMap.delete(t.identifier);
    }

    // Clear any pending release
    if (touchReleaseTimeout) {
      clearTimeout(touchReleaseTimeout);
    }

    // Batch release all buttons together after a tiny delay
    // This ensures multi-touch combos release simultaneously
    touchReleaseTimeout = setTimeout(() => {
      // If no touches remain, submit the active buttons as a chord
      if (touchMap.size === 0) {
        const activeBtns = Array.from(document.querySelectorAll('.gp-btn.active'))
          .map(el => Number(el.dataset.button))
          .filter(n => !Number.isNaN(n));
        if (activeBtns.length) handleInput(activeBtns);
        
        // Clear ALL active buttons simultaneously
        document.querySelectorAll('.gp-btn.active').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
          // Force reflow for synchronized animation
          void btn.offsetWidth;
        });
      }
      touchReleaseTimeout = null;
    }, 10); // 10ms batch window for multi-touch release
  }

  // Touch cancel handler to prevent stuck buttons
  function onTouchCancel(e) {
    // Clear all touch mappings
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const btn = touchMap.get(t.identifier);
      if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
      touchMap.delete(t.identifier);
    }
    
    // If all touches are gone, clear all active buttons
    if (touchMap.size === 0) {
      document.querySelectorAll('.gp-btn.active').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
    }
  }

  gpButtons.forEach(b => {
    b.addEventListener('touchstart', onTouchStart, { passive: false });
  });
  window.addEventListener('touchend', onTouchEnd, { passive: false });
  window.addEventListener('touchcancel', onTouchCancel, { passive: false });

  // --- Keyboard support: simultaneous key presses ---
  const activeKeys = new Set();
  function keyToBtn(e) {
    let k = e.key;
    if (k && ['0','1','2','3'].includes(k)) return k;
    if (e.code && e.code.startsWith('Numpad')) {
      const n = e.code.slice(6);
      if (['0','1','2','3'].includes(n)) return n;
    }
    return null;
  }

  function onGlobalKeyDown(e) {
    const btn = keyToBtn(e);
    if (!btn) return;
    if (activeKeys.has(btn)) return;
    activeKeys.add(btn);
    const el = document.querySelector(`[data-button="${btn}"]`);
    if (!el) return;
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');

    // Check current active buttons and evaluate
    const activeBtns = Array.from(document.querySelectorAll('.gp-btn.active'))
      .map(el => Number(el.dataset.button))
      .filter(n => !Number.isNaN(n));
    handleInput(activeBtns);
  }

  function onGlobalKeyUp(e) {
    const btn = keyToBtn(e);
    if (!btn) return;
    activeKeys.delete(btn);
    const el = document.querySelector(`[data-button="${btn}"]`);
    if (!el) return;
    el.classList.remove('active');
    el.setAttribute('aria-pressed', 'false');
  }

  window.addEventListener('keydown', onGlobalKeyDown);
  window.addEventListener('keyup', onGlobalKeyUp);
  
  // Failsafe: clear any stuck active buttons on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      touchMap.clear();
      document.querySelectorAll('.gp-btn.active').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
    }
  });
  
  window.addEventListener('blur', () => {
    activeKeys.forEach(k => {
      const el = document.querySelector(`[data-button="${k}"]`);
      if (el) {
        el.classList.remove('active');
        el.setAttribute('aria-pressed','false');
      }
    });
    activeKeys.clear();
  });

  // initial render
  renderCurrent();

  // listen for transposition changes from the TranspositionPanel (document-level event)
  const onTranspositionChange = (e) => {
    const detail = (e && e.detail) || {};
    // If transposition is explicitly disabled or detail carries 'default', revert to initial values
    if (detail.enabled === false || detail.instrument === 'default' || detail.key === 'default') {
      instrument = initialInstrument;
      key = initialKey;
    } else {
      if (detail.instrument) instrument = detail.instrument;
      if (detail.key) key = detail.key;
    }
    // When instrument/key change, recompute the available notes and pick a valid current note
    const list = availableNotes();
    if (list.length === 0) {
      // nothing playable for this instrument/key — clear current
      currentIndex = 0;
      renderCurrent();
      return;
    }
    // If the current note is no longer available, pick a new one
    const cur = getCurrentNoteData();
    if (!cur) {
      currentIndex = Math.floor(Math.random() * list.length);
    } else {
      // ensure currentIndex is within bounds
      if (currentIndex >= list.length) currentIndex = 0;
    }
    renderCurrent();
  };

  document.addEventListener('transposition:change', onTranspositionChange);

  // Listen for external game:end events (e.g., from speed mode timer)
  // to save the score if it hasn't been saved yet
  const onExternalGameEnd = (e) => {
    if (ended) return; // Already ended and saved
    if (e && e.detail && e.detail.reason === 'timeout' && mode === 'speed') {
      ended = true;
      // Get scores from scorer
      const scores = scorer.getScores();
      // Save speed mode score via REST API
      const user = getCurrentUser();
      if (user) {
        // Calculate average speed for proficiency
        const avgSpeed = noteTimes.length > 0 
          ? noteTimes.reduce((sum, t) => sum + t, 0) / noteTimes.length 
          : 1.5; // Speed mode typically faster
        
        // Update transposition proficiency (each instrument/key combo tracked separately)
        const proficiencyUpdate = TranspositionProficiency.recordSession(
          user.uid,
          instrument,
          key,
          {
            score: correctCount,
            total: noteCount,
            avgSpeed: avgSpeed,
            notesPracticed: Array.from(notesPracticed),
            mode: 'speed',
            difficulty: difficulty
          }
        );
        
        const scoreData = {
          userId: user.uid,
          mode: 'speed',
          level: difficulty,
          score: correctCount,
          total: noteCount,
          percentage: noteCount > 0 ? Math.round((correctCount / noteCount) * 100) : 0,
          displayScore: scores.displayScore,
          proficiencyScore: proficiencyUpdate.proficiencyDisplay,
          stars: scores.stars,
          instrument: instrument,
          key: key,
          timestamp: new Date(),
          completed: true,
          endReason: 'timeout',
          avgSpeed: avgSpeed,
          notesCovered: notesPracticed.size
        };
        console.log('💾 Saving speed mode score via REST API:', scoreData);
        console.log('🎯 Proficiency:', proficiencyUpdate);
        saveScore(scoreData).then(() => {
          console.log('✅ Speed mode score saved successfully');
        }).catch(error => {
          console.error('❌ Error saving speed mode score:', error);
        });
      } else {
        console.error('❌ No user when trying to save speed mode score');
      }
      // Dispatch event with scores for EndGameOverlay
      const endEv = new CustomEvent('game:end', { 
        detail: { 
          score: correctCount, 
          total: noteCount, 
          reason: 'timeout',
          accuracy: scores.displayScore,
          stars: scores.stars,
          mode
        }, 
        bubbles: true, 
        composed: true 
      });
      try { container.dispatchEvent(endEv); } catch (err) {}
      try { window.dispatchEvent(endEv); } catch (err) {}
    }
  };
  
  window.addEventListener('game:end', onExternalGameEnd);
  document.addEventListener('game:end', onExternalGameEnd);

  return {
    destroy() {
      gpButtons.forEach(b => b.removeEventListener('click', onClick));
      document.removeEventListener('transposition:change', onTranspositionChange);
      window.removeEventListener('game:end', onExternalGameEnd);
      document.removeEventListener('game:end', onExternalGameEnd);
      if (pendingWrongTimer) { clearTimeout(pendingWrongTimer); pendingWrongTimer = null; }
      if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
    }
  };
}