// /utils/getFingerings.js

import * as BbModule from "../fingerings/Bbtrumpet.js";
import * as CModule from "../fingerings/Ctrumpet.js";
import * as DModule from "../fingerings/Dtrumpet.js";
import * as EbModule from "../fingerings/Ebtrumpet.js";

// Map instrument name to the corresponding fingerings export
const INSTRUMENT_MAP = {
  Bb: BbModule.fingeringsByKey || BbModule.default || {},
  C: CModule.fingeringsByKey || CModule.default || {},
  D: DModule.fingeringsByKey || DModule.default || {},
  Eb: EbModule.fingeringsByKey || EbModule.default || {}
};

/**
 * Returns the normalized fingering string for the chosen instrument mapping.
 * @param {string} instrument - one of 'Bb','C','D','Eb' (falls back to 'Bb')
 * @param {string} noteImage - image filename key like 'C1.png'
 * @param {string} key - musical key mapping like 'Bb','C','D' etc.
 */
export function getFingering(instrument = 'Bb', noteImage, key = 'Bb') {
  const mod = INSTRUMENT_MAP[instrument] || INSTRUMENT_MAP['Bb'] || {};
  const keyMap = mod[key] || mod['Bb'] || {};

  if (!noteImage) return null;

  // direct lookup first
  let fingering = keyMap[noteImage];

  // If not found, support slash-separated alternate names like
  // "Csharp1.png/Dflat1.png". Search keys for an entry that contains
  // the requested noteImage in its slash-separated parts.
  if (typeof fingering === 'undefined') {
    const found = Object.keys(keyMap).find(k => {
      if (!k) return false;
      const parts = k.split('/').map(p => p.trim());
      return parts.includes(noteImage);
    });
    if (found) fingering = keyMap[found];
  }

  if (typeof fingering === 'undefined' || fingering === null) return null;

  // fingeringsByKey entries may be an array of alternative normalized
  // fingering strings (e.g., ['2,3','2']) or a single string. Choose
  // the correct alternative based on the instrument:
  // - if instrument is 'Bb' or 'default' => prefer the SECOND alternative
  // - otherwise => prefer the FIRST alternative
  // At this point `fingering` may be:
  // - an array of alternative normalized strings (e.g. ['1,2','0'])
  // - a single normalized string (e.g. '1,2')
  // We return a canonical array of numbers (e.g. [1,2]) or null.
  function parseToNumbers(s) {
    if (!s || typeof s !== 'string') return null;
    const nums = s.split(',').map(x => Number(x.trim())).filter(n => !Number.isNaN(n));
    if (nums.length === 0) return null;
    // unique & sort
    const uniq = Array.from(new Set(nums)).sort((a, b) => a - b);
    return uniq;
  }

  if (Array.isArray(fingering)) {
    const a0 = parseToNumbers(fingering[0]);
    const a1 = parseToNumbers(fingering[1]);
    let chosen = null;
    if (instrument === 'Bb' || instrument === 'default') {
      chosen = a1 || a0 || null;
    } else {
      chosen = a0 || a1 || null;
    }
    return chosen;
  }

  // otherwise a single normalized string
  return parseToNumbers(fingering);
}
