import { initGame } from './gameLogic.js';

/**
 * Launch the game from the page.
 * @param {string} modeKey - game mode key (learning/marathon/speed) — kept for compatibility
 * @param {HTMLElement} container - container element where game lives
 * @param {{ instrument?: string, key?: string, difficulty?: string }} [opts]
 */
export function launchGame(modeKey, container, opts = {}) {
  const instrument = opts.instrument || 'Bb';
  const key = opts.key || 'Bb';
  const difficulty = opts.difficulty || 'basic';
  const speedTimeout = opts.speedTimeout;

  // Pass mode and speedTimeout along so game logic can adapt (e.g., Learning mode end condition)
  initGame({ instrument, key, difficulty, container, mode: modeKey, speedTimeout });
}
