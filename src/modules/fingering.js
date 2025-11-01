// /src/modules/fingering.js
import { ALL_NOTES } from '../data/allNotes.js';
import { getTransposedNoteName } from './transpose.js';

/**
 * Get the fingering combo(s) for a note, optionally transposed.
 * @param {string} noteName - Original note name (e.g., "A0", "Csharp1")
 * @param {Array} levelData - Array of note definitions for the current level/game
 * @param {number} transposeOffset - Optional transpose offset in semitones
 * @returns {Array<Array<string>> | null} - Array of key combos (each combo is an array of strings)
 */
export function getFingeringForNote(noteName, levelData, transposeOffset = 0) {
  if (!noteName) return null;

  const transposedName = getTransposedNoteName(noteName, transposeOffset);

  // Check levelData first for overrides
  for (const entry of levelData) {
    if (entry.note.replace('.png','') === transposedName) {
      return Array.isArray(entry.keys[0]) ? entry.keys.map(k => k.map(String)) : [entry.keys.map(String)];
    }
  }

  // Fallback to ALL_NOTES
  for (const entry of ALL_NOTES) {
    if (entry.names.includes(transposedName)) {
      return Array.isArray(entry.keys[0]) ? entry.keys.map(k => k.map(String)) : [entry.keys.map(String)];
    }
  }

  return null;
}

/**
 * Checks if a pressed combo matches any accepted combo for a note
 * @param {Array<string>} pressedKeys - Array of pressed key strings
 * @param {Array<Array<string>>} acceptedCombos - Output from getFingeringForNote
 * @returns {boolean} true if match
 */
export function isCorrectCombo(pressedKeys, acceptedCombos) {
  if (!Array.isArray(pressedKeys) || !Array.isArray(acceptedCombos)) return false;

  return acceptedCombos.some(combo => 
    combo.length === pressedKeys.length &&
    combo.every(k => pressedKeys.includes(k))
  );
}

/**
 * Flatten an array of combos into a string representation
 * @param {Array<Array<string>>} combos 
 * @returns {Array<string>} array of combos as comma-separated strings
 */
export function formatCombos(combos) {
  if (!Array.isArray(combos)) return [];
  return combos.map(c => Array.isArray(c) ? c.join(',') : String(c));
}
