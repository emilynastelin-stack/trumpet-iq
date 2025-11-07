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
  const gameInstance = initGame({ instrument, key, difficulty, container, mode: modeKey, speedTimeout });
  
  // Store game instance globally so it can be cleaned up on navigation
  window.currentGameInstance = gameInstance;
  
  // Listen for cleanup event from navigation
  const cleanupHandler = () => {
    console.log('🧹 Game cleanup event received');
    if (window.currentGameInstance && typeof window.currentGameInstance.destroy === 'function') {
      window.currentGameInstance.destroy();
      window.currentGameInstance = null;
    }
    // Remove this listener after cleanup
    window.removeEventListener('game:cleanup', cleanupHandler);
    document.removeEventListener('game:cleanup', cleanupHandler);
  };
  
  window.addEventListener('game:cleanup', cleanupHandler);
  document.addEventListener('game:cleanup', cleanupHandler);
  
  return gameInstance;
}
