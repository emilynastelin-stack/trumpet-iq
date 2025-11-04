/**
 * HapticManager - Unified haptic feedback system
 * Supports both Vibration API (web) and Capacitor Haptics (native)
 */
class HapticManager {
  constructor() {
    this.enabled = localStorage.getItem('haptics-enabled') !== 'false';
    this.supportsVibration = 'vibrate' in navigator;
    this.supportsCapacitor = false;
    
    // Check for Capacitor Haptics
    this.initCapacitor();
  }

  async initCapacitor() {
    try {
      if (window.Capacitor) {
        const { Haptics } = await import('@capacitor/haptics');
        this.Haptics = Haptics;
        this.supportsCapacitor = true;
        console.log('[Haptics] Capacitor Haptics initialized');
      }
    } catch (error) {
      console.log('[Haptics] Capacitor not available, using Vibration API');
    }
  }

  /**
   * Enable haptic feedback
   */
  enable() {
    this.enabled = true;
    localStorage.setItem('haptics-enabled', 'true');
    console.log('[Haptics] Enabled');
  }

  /**
   * Disable haptic feedback
   */
  disable() {
    this.enabled = false;
    localStorage.setItem('haptics-enabled', 'false');
    console.log('[Haptics] Disabled');
  }

  /**
   * Check if haptics are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Check if device supports haptics
   */
  isSupported() {
    return this.supportsVibration || this.supportsCapacitor;
  }

  /**
   * Trigger haptic feedback with a specific pattern
   * @param {string} pattern - Predefined pattern name
   */
  async trigger(pattern = 'light') {
    if (!this.enabled) return;

    // Debug log with visual indicator
    console.log(`🐝 buzz [${pattern}]`);
    
    // Visual debug flash on screen
    this.showDebugFlash(pattern);

    // Use Capacitor Haptics if available (better quality on iOS/Android)
    if (this.supportsCapacitor && this.Haptics) {
      await this.triggerCapacitor(pattern);
    } 
    // Fallback to Vibration API
    else if (this.supportsVibration) {
      this.triggerVibration(pattern);
    }
  }

  /**
   * Show a visual flash when haptic triggers (for debugging)
   */
  showDebugFlash(pattern) {
    // Create or get debug indicator
    let indicator = document.getElementById('haptic-debug-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'haptic-debug-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 16px;
        background: rgba(16, 185, 129, 0.95);
        color: white;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        z-index: 999999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(indicator);
    }

    // Update text and show
    indicator.textContent = `🐝 ${pattern}`;
    indicator.style.opacity = '1';

    // Hide after short delay
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 300);
  }

  /**
   * Trigger haptic using Capacitor (native iOS/Android)
   */
  async triggerCapacitor(pattern) {
    try {
      const { ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      
      switch (pattern) {
        case 'light':
        case 'tap':
        case 'button':
          await this.Haptics.impact({ style: ImpactStyle.Light });
          break;
        
        case 'medium':
        case 'valve':
          await this.Haptics.impact({ style: ImpactStyle.Medium });
          break;
        
        case 'heavy':
        case 'gameStart':
          await this.Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        
        case 'success':
        case 'correct':
          await this.Haptics.notification({ type: NotificationType.Success });
          break;
        
        case 'error':
        case 'wrong':
          await this.Haptics.notification({ type: NotificationType.Error });
          break;
        
        case 'warning':
        case 'lifelose':
          await this.Haptics.notification({ type: NotificationType.Warning });
          break;
        
        case 'selection':
          await this.Haptics.selectionStart();
          await new Promise(resolve => setTimeout(resolve, 50));
          await this.Haptics.selectionEnd();
          break;
        
        default:
          await this.Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.error('[Haptics] Capacitor error:', error);
      // Fallback to vibration
      this.triggerVibration(pattern);
    }
  }

  /**
   * Trigger haptic using Vibration API (web browsers)
   */
  triggerVibration(pattern) {
    if (!this.supportsVibration) return;

    const patterns = {
      // Light feedback
      light: 10,
      tap: 10,
      button: 12,
      
      // Medium feedback
      medium: 20,
      valve: 25,
      
      // Heavy feedback
      heavy: 50,
      gameStart: 40,
      
      // Success patterns (double pulse)
      success: [15, 40, 15],
      correct: [12, 35, 12],
      
      // Error patterns (longer pulses)
      error: [80, 50, 80],
      wrong: [60, 40, 60],
      
      // Warning (single strong pulse)
      warning: 100,
      lifelose: 120,
      
      // Selection (triple light)
      selection: [8, 20, 8, 20, 8],
      
      // Game events
      gameEnd: [20, 30, 20, 30, 20],
      levelUp: [15, 20, 15, 20, 15, 20, 15],
      
      // Navigation
      swipe: 8,
      scroll: 5,
    };

    const vibrationPattern = patterns[pattern] || patterns.light;
    
    try {
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.error('[Haptics] Vibration error:', error);
    }
  }

  /**
   * Convenience methods for common actions
   */
  
  // UI Interactions
  onButtonPress() { this.trigger('button'); }
  onValvePress() { this.trigger('valve'); }
  onTap() { this.trigger('tap'); }
  onSwipe() { this.trigger('swipe'); }
  
  // Game Events
  onCorrectNote() { this.trigger('correct'); }
  onWrongNote() { this.trigger('wrong'); }
  onLifeLost() { this.trigger('lifelose'); }
  onGameStart() { this.trigger('gameStart'); }
  onGameEnd() { this.trigger('gameEnd'); }
  onLevelUp() { this.trigger('levelUp'); }
  
  // Navigation
  onNavigation() { this.trigger('light'); }
  onSelection() { this.trigger('selection'); }

  /**
   * Test haptic feedback
   */
  async test() {
    console.log('[Haptics] Testing haptic feedback...');
    console.log('[Haptics] Supported:', this.isSupported());
    console.log('[Haptics] Enabled:', this.isEnabled());
    console.log('[Haptics] Capacitor:', this.supportsCapacitor);
    console.log('[Haptics] Vibration API:', this.supportsVibration);
    
    if (this.isSupported() && this.isEnabled()) {
      await this.trigger('medium');
      console.log('[Haptics] Test vibration triggered');
    } else {
      console.log('[Haptics] Cannot test - not supported or disabled');
    }
  }
}

// Create singleton instance
const haptics = new HapticManager();

// Expose globally
window.haptics = haptics;

// Debug: Confirm HapticManager is loaded
console.log('[Haptics] 🎺 HapticManager loaded and ready!');
console.log('[Haptics] Enabled:', haptics.isEnabled());
console.log('[Haptics] Supported:', haptics.isSupported());
console.log('[Haptics] Available globally as window.haptics');

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HapticManager;
}
