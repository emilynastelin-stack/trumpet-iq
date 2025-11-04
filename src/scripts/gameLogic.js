// gameLogic.js
import { levels } from '../data/levels.js';
import { getFingering } from '../utils/getFingerings.js';

/**
 * Initialize the game with dynamic fingerings.
 * @param {{
 *   instrument: string,
 *   key: string,
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
  let pointsEarned = 0; // points earned (100 per correct in speed/marathon, accuracy % in learning)
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
    // Dispatch a progress event for debugging: how many notes have been shown.
    // For UI/display purposes we report a zero-based index so the first note
    // appears as "0" rather than "1". Keep internal `noteCount` (used for
    // end-of-game totals) unchanged.
    const displayNoteCount = Math.max(0, noteCount - 1);
    const progressEv = new CustomEvent('game:progress', { 
      detail: { 
        noteCount: displayNoteCount, 
        correctCount,
        score: (mode === 'speed' || mode === 'marathon') ? pointsEarned : correctCount,
        lives: mode === 'marathon' ? lives : undefined 
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
      // remove the cleared marker after the animation
      window.setTimeout(() => el.classList.remove('cleared'), 260);
    });
  }

  function showFeedback(ok) {
    const ev = new CustomEvent('game:feedback', { detail: { ok }, bubbles: true, composed: true });
    try { container.dispatchEvent(ev); } catch (err) {}
    try { window.dispatchEvent(ev); } catch (err) {}
    
    // Trigger haptic feedback based on correctness
    if (window.haptics) {
      if (ok) {
        window.haptics.onCorrectNote();
      } else {
        window.haptics.onWrongNote();
      }
    }
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
        // Award 100 points per correct answer in speed/marathon mode
        if (mode === 'speed' || mode === 'marathon') {
          pointsEarned += 100;
        }
      }
      // If this was the final learning note, end the game now so the
      // player's point for this note is included in the final score.
      if (mode === 'learning' && !ended && noteCount >= 20) {
        ended = true;
        const accuracyPercent = Math.round((correctCount / noteCount) * 100);
        // Save progress to Dexie
        import('./db.js').then(({ saveProgress }) => {
          saveProgress({
            mode: mode || 'learning',
            level: difficulty || 'basic',
            score: accuracyPercent,
            completed: true,
            lastPlayed: Date.now()
          });
        }).catch(e => console.error('Failed to save progress:', e));
        const endEv = new CustomEvent('game:end', { detail: { score: correctCount, total: noteCount, accuracy: accuracyPercent }, bubbles: true, composed: true });
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
            // Award 100 points per correct answer in speed/marathon mode
            if (mode === 'speed' || mode === 'marathon') {
              pointsEarned += 100;
            }
          }
          if (mode === 'learning' && !ended && noteCount >= 20) {
            ended = true;
            const accuracyPercent = Math.round((correctCount / noteCount) * 100);
            // Save progress to localStorage
            try {
              const progressKey = 'userProgress';
              const modeName = mode || 'learning';
              const levelName = difficulty || 'basic';
              let progress = {};
              try {
                progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
              } catch (e) { progress = {}; }
              if (!progress[modeName]) progress[modeName] = {};
              progress[modeName][levelName] = {
                score: accuracyPercent,
                completed: true,
                lastPlayed: Date.now()
              };
              localStorage.setItem(progressKey, JSON.stringify(progress));
            } catch (e) { console.error('Failed to save progress:', e); }
            const endEv = new CustomEvent('game:end', { detail: { score: correctCount, total: noteCount, accuracy: accuracyPercent }, bubbles: true, composed: true });
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
              const accuracyPercent = noteCount > 0 ? Math.round((correctCount / noteCount) * 100) : 0;
              const endEv = new CustomEvent('game:end', { 
                detail: { 
                  score: pointsEarned, 
                  total: noteCount, 
                  correctCount, 
                  accuracy: accuracyPercent,
                  reason: 'lives' 
                }, 
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
            const accuracyPercent = Math.round((correctCount / noteCount) * 100);
            const endEv = new CustomEvent('game:end', { detail: { score: correctCount, total: noteCount, accuracy: accuracyPercent }, bubbles: true, composed: true });
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
  function onTouchStart(e) {
    // prevent mouse-emulation click events
    e.preventDefault();
    const el = e.currentTarget;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchMap.set(t.identifier, el);
      // mark pressed visually
      el.classList.add('active');
      el.setAttribute('aria-pressed', 'true');
    }
    
    // Trigger haptic feedback on valve press
    if (window.haptics) {
      window.haptics.onValvePress();
    }
  }

  // When touches end, if there are no remaining touches, submit the current chord
  function onTouchEnd(e) {
    // remove mappings for changed touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touchMap.delete(t.identifier);
    }

    // If no touches remain, submit the active buttons as a chord and clear
    if (touchMap.size === 0) {
      const activeBtns = Array.from(document.querySelectorAll('.gp-btn.active'))
        .map(el => Number(el.dataset.button))
        .filter(n => !Number.isNaN(n));
      if (activeBtns.length) handleInput(activeBtns);
    }
  }

  gpButtons.forEach(b => {
    b.addEventListener('touchstart', onTouchStart, { passive: false });
  });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);

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

  return {
    destroy() {
      gpButtons.forEach(b => b.removeEventListener('click', onClick));
      document.removeEventListener('transposition:change', onTranspositionChange);
      if (pendingWrongTimer) { clearTimeout(pendingWrongTimer); pendingWrongTimer = null; }
      if (speedTimer) { clearTimeout(speedTimer); speedTimer = null; }
    }
  };
}