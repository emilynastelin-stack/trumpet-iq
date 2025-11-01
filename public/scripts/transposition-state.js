// transposition-state.js
// Shared state management for transposition controls

class TranspositionState {
  constructor() {
    // Default state
    this.instrument = 'Bb';
    this.key = 'Bb';
    this.enabled = false;
    this.source = null;
  }

  /**
   * Update the transposition state
   * @param {Object} changes - The changes to apply
   * @param {string} changes.instrument - The instrument (Bb, C, D, Eb)
   * @param {string} changes.key - The key (A, Bb, H, C, D, Eb, E, F, G)
   * @param {boolean} changes.enabled - Whether transposition is enabled
   * @param {string} changes.source - The control ID that triggered the change
   */
  update(changes) {
    const hasChanges = 
      (changes.instrument && changes.instrument !== this.instrument) ||
      (changes.key && changes.key !== this.key) ||
      (changes.enabled !== undefined && changes.enabled !== this.enabled);

    if (!hasChanges) return;

    // Apply changes
    if (changes.instrument !== undefined) {
      this.instrument = changes.instrument;
    }
    if (changes.key !== undefined) {
      this.key = changes.key;
    }
    if (changes.enabled !== undefined) {
      this.enabled = changes.enabled;
    }
    if (changes.source !== undefined) {
      this.source = changes.source;
    }

    // Notify all listeners
    this.notify();
  }

  /**
   * Notify all listeners of state changes
   */
  notify() {
    const detail = {
      instrument: this.instrument,
      key: this.key,
      enabled: this.enabled,
      source: this.source
    };

    // New sync event for TranspositionControls
    window.dispatchEvent(new CustomEvent('transposition:sync', {
      detail,
      bubbles: true,
      composed: true
    }));

    // Legacy event for gameLogic.js compatibility
    document.dispatchEvent(new CustomEvent('transposition:change', {
      detail,
      bubbles: true,
      composed: true
    }));

    window.dispatchEvent(new CustomEvent('transposition:change', {
      detail,
      bubbles: true,
      composed: true
    }));

    // Also store in session storage for persistence
    try {
      sessionStorage.setItem('transposition-state', JSON.stringify({
        instrument: this.instrument,
        key: this.key,
        enabled: this.enabled
      }));
    } catch (e) {
      console.warn('Could not save transposition state to sessionStorage:', e);
    }
  }

  /**
   * Get the current state
   * @returns {Object} Current transposition state
   */
  getState() {
    return {
      instrument: this.instrument,
      key: this.key,
      enabled: this.enabled
    };
  }

  /**
   * Get the fingering file path for the current instrument and key
   * @returns {string} Path to the fingering file
   */
  getFingeringFile() {
    if (!this.enabled) {
      // Default to Bb trumpet in C when transposition is disabled
      return '/fingerings/Bbtrumpet.js';
    }

    // Map instrument to file names
    const instrumentFiles = {
      'Bb': 'Bbtrumpet',
      'C': 'Ctrumpet',
      'D': 'Dtrumpet',
      'Eb': 'Ebtrumpet'
    };

    const fileName = instrumentFiles[this.instrument] || 'Bbtrumpet';
    return `/fingerings/${fileName}.js`;
  }

  /**
   * Load the appropriate fingering data
   * @returns {Promise<Object>} The fingering data for the selected instrument and key
   */
  async loadFingerings() {
    const filePath = this.getFingeringFile();
    
    try {
      // Dynamically import the fingering file
      const module = await import(filePath);
      const fingeringData = module.default || module;
      
      // Get fingerings for the selected key
      const keyFingerings = fingeringData[this.key];
      
      if (!keyFingerings) {
        console.warn(`No fingerings found for key ${this.key} in ${filePath}`);
        return null;
      }
      
      return keyFingerings;
    } catch (error) {
      console.error(`Failed to load fingerings from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Restore state from session storage
   */
  restoreFromStorage() {
    try {
      const saved = sessionStorage.getItem('transposition-state');
      if (saved) {
        const state = JSON.parse(saved);
        this.instrument = state.instrument || 'Bb';
        this.key = state.key || 'Bb';
        this.enabled = state.enabled || false;
        
        // Notify without triggering infinite loops
        this.source = 'storage';
        this.notify();
      }
    } catch (e) {
      console.warn('Could not restore transposition state from sessionStorage:', e);
    }
  }

  /**
   * Reset to default state
   */
  reset() {
    this.update({
      instrument: 'Bb',
      key: 'Bb',
      enabled: false,
      source: 'reset'
    });
  }
}

// Create singleton instance
if (!window.TranspositionState) {
  window.TranspositionState = new TranspositionState();
  
  // Restore from storage on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.TranspositionState.restoreFromStorage();
    });
  } else {
    window.TranspositionState.restoreFromStorage();
  }
}

// Export for module usage (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranspositionState;
}