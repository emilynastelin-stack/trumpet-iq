# Haptic Feedback Implementation

## ✅ What's Been Added

### 1. **HapticManager.js** (`/public/scripts/HapticManager.js`)
A comprehensive haptic feedback manager that supports:
- **Vibration API** (web browsers) - works on most mobile devices
- **Capacitor Haptics** (native iOS/Android) - higher quality feedback
- User preferences (enable/disable)
- Multiple feedback patterns for different interactions

### 2. **Integrated Throughout the App**

#### Footer Buttons
- Light haptic feedback when pressing any footer button
- Location: `src/layouts/Layout.astro` (line ~370)

#### Gamepad/Valve Buttons
- Medium haptic feedback when pressing valve buttons (0, 1, 2, 3)
- Location: `src/scripts/gameLogic.js` (touchStart event)

#### Game Feedback
- **Correct Note**: Success pattern (double pulse)
- **Wrong Note**: Error pattern (longer pulses)
- Location: `src/scripts/gameLogic.js` (showFeedback function)

#### Settings Panel
- Toggle to enable/disable haptics
- "Test Vibration" button
- Location: `src/components/UserSettings.astro`

## 📱 Testing Haptic Feedback

### On Desktop
1. Open Chrome DevTools Console
2. Test manually:
   ```javascript
   haptics.test()              // Test default vibration
   haptics.trigger('correct')  // Test success pattern
   haptics.trigger('wrong')    // Test error pattern
   ```

### On Mobile (Real Device Required)
1. Open the app on your phone
2. Open **Settings** (gear icon in footer)
3. Find **"Haptic Feedback"** section
4. Tap **"Test Vibration"** button
5. You should feel a medium vibration

### Testing Different Patterns
Open the browser console on your phone and try:
```javascript
// Button press
haptics.onButtonPress()

// Valve press  
haptics.onValvePress()

// Correct note
haptics.onCorrectNote()

// Wrong note
haptics.onWrongNote()

// Custom patterns
haptics.trigger('light')
haptics.trigger('medium')
haptics.trigger('heavy')
haptics.trigger('success')
haptics.trigger('error')
```

## 🎮 Available Patterns

| Pattern | Duration | Use Case |
|---------|----------|----------|
| `light` | 10ms | Quick tap, navigation |
| `tap` | 10ms | Button tap |
| `button` | 12ms | General button press |
| `medium` | 20ms | Standard interaction |
| `valve` | 25ms | Gamepad valve press |
| `heavy` | 50ms | Strong action |
| `correct` | [12, 35, 12] | Double pulse for success |
| `success` | [15, 40, 15] | Achievement |
| `wrong` | [60, 40, 60] | Longer error pulse |
| `error` | [80, 50, 80] | Strong error |
| `lifelose` | 120ms | Life lost in marathon |
| `gameStart` | 40ms | Game begins |
| `gameEnd` | [20, 30, 20, 30, 20] | Game complete |
| `levelUp` | [15, 20, 15, 20, 15, 20, 15] | Level advancement |

## 🔧 User Preferences

Haptic feedback can be toggled on/off:
1. Tap **Settings** (gear icon) in the footer
2. Find **"Haptic Feedback"** section
3. Toggle the switch
4. Setting is saved to `localStorage` as `haptics-enabled`

Default: **Enabled** (can be changed in HapticManager.js constructor)

## 💡 Device Support

### ✅ Supported
- **iOS Safari** (iPhone/iPad) - via Vibration API and Capacitor
- **Android Chrome** - via Vibration API and Capacitor
- **Android Firefox** - via Vibration API

### ❌ Not Supported
- **iOS Simulator** - no haptic support in simulator
- **Desktop browsers** - most don't support vibration
- **Some older devices** - may not have vibration hardware

## 🚀 How It Works

### 1. Loading
```astro
<!-- src/layouts/Layout.astro -->
<script src="/scripts/HapticManager.js"></script>
```

### 2. Global Access
```javascript
// Available everywhere as:
window.haptics

// Usage:
if (window.haptics) {
  window.haptics.onButtonPress();
}
```

### 3. Automatic Fallbacks
- **Capacitor available**: Uses native iOS/Android Haptic Engine (best quality)
- **Capacitor not available**: Falls back to Vibration API (still good)
- **No support**: Silently fails (no errors)

## 📝 Adding Haptics to New Features

### Example: Add to a button click
```javascript
button.addEventListener('click', () => {
  // Trigger haptic feedback
  if (window.haptics) {
    window.haptics.onButtonPress();
  }
  
  // Your button logic...
});
```

### Example: Add to game events
```javascript
// In your game logic
function onPlayerWins() {
  if (window.haptics) {
    window.haptics.trigger('success');
  }
  // Show win screen...
}

function onPlayerLosesLife() {
  if (window.haptics) {
    window.haptics.onLifeLost();
  }
  // Update lives display...
}
```

## 🐛 Troubleshooting

### Haptics not working?
1. **Check device support**: Open console and run `haptics.isSupported()`
2. **Check if enabled**: Run `haptics.isEnabled()`
3. **Check device settings**: Make sure device isn't in silent mode (iOS)
4. **Test directly**: Run `navigator.vibrate(200)` in console
5. **Check browser**: Some browsers block vibration API

### TypeScript errors?
The TypeScript errors about `window.haptics` not existing are just type checking issues. They won't affect functionality. The code safely checks `if (window.haptics)` before use.

### No vibration on iOS?
- iOS requires the device to NOT be in silent mode
- iOS Simulator does NOT support haptics (use real device)
- Some older iPhones may not have Taptic Engine

## 🎯 Future Enhancements

Possible additions:
- [ ] Haptic intensity slider (light/medium/heavy)
- [ ] Different patterns for different game modes
- [ ] Haptic "themes" (subtle vs responsive)
- [ ] Haptic feedback for progress milestones
- [ ] Custom pattern creator

## 📚 API Reference

### HapticManager Methods

```typescript
// Enable/Disable
haptics.enable()              // Enable haptics
haptics.disable()             // Disable haptics
haptics.isEnabled()           // Check if enabled
haptics.isSupported()         // Check if device supports

// Trigger patterns
haptics.trigger(pattern)      // Trigger any pattern by name

// Convenience methods
haptics.onButtonPress()       // Button pressed
haptics.onValvePress()        // Valve button pressed
haptics.onTap()              // Quick tap
haptics.onCorrectNote()      // Correct answer
haptics.onWrongNote()        // Wrong answer
haptics.onLifeLost()         // Life lost
haptics.onGameStart()        // Game started
haptics.onGameEnd()          // Game ended
haptics.onLevelUp()          // Level up
haptics.onNavigation()       // Page navigation
haptics.onSelection()        // Item selected

// Testing
haptics.test()               // Test vibration (medium)
```

## 🎨 Customization

### Change default state
Edit `HapticManager.js`:
```javascript
constructor() {
  // Change default from enabled to disabled:
  this.enabled = localStorage.getItem('haptics-enabled') === 'true'; // Now disabled by default
}
```

### Add custom patterns
Edit `HapticManager.js`:
```javascript
triggerVibration(pattern) {
  const patterns = {
    // Add your custom pattern:
    myCustomPattern: [50, 30, 50, 30, 50],
    // ...
  };
}
```

### Change intensity
Edit pattern durations in `triggerVibration()` method:
- Shorter duration = lighter feedback
- Longer duration = stronger feedback
- Arrays = pulsed patterns

---

**Ready to test!** Open your app on a mobile device and try pressing valve buttons or answering notes. You should feel gentle vibrations for each interaction. 🎺✨
